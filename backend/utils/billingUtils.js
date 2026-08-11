/**
 * Shared utility for matching a Radiology Case to a Tariff Rule
 * Handles modality normalization and procedure-prefix study type matching.
 */
export const findMatchingTariff = (allTariffs, modality, studyType, hospitalId, radiologistId) => {
    // Only consider active tariffs
    const tariffs = allTariffs.filter(t => t.isActive !== false);

    // Normalize modality (XRAY -> X-Ray, etc)
    let normalizedModality = modality?.toUpperCase();
    if (normalizedModality === 'XRAY') normalizedModality = 'X-Ray';

    const normalizedStudyType = studyType?.toLowerCase().trim();

    console.log(`[Tariff Match] Searching: Modality="${normalizedModality}", Study="${normalizedStudyType}", Hospital="${hospitalId}", Doctor="${radiologistId}" (${tariffs.length} active rules)`);

    // Helper for modality matching
    const isModalityMatch = (t) => {
        const tModality = t.modality.toUpperCase() === 'XRAY' ? 'X-Ray' : t.modality;
        return tModality === normalizedModality;
    };

    // Stricter study match: tariff studyType must equal OR start with the procedure description.
    // e.g. "ct brain" startsWith "ct brain" ✓, "ct brain wo contrast" startsWith "ct brain" ✓
    // but "mri brain wo contrast" startsWith "ct brain" ✗ — prevents cross-modality false positives.
    const isStudyMatch = (t) => {
        const tStudy = t.studyType.toLowerCase();
        return tStudy === normalizedStudyType ||
            tStudy.startsWith(normalizedStudyType);
    };

    // Picks first match from a filtered candidate set.
    // Warns when multiple tariffs match the same procedure string (admin should tighten studyType names).
    const pickWithAmbiguityCheck = (candidates) => {
        if (candidates.length > 1) {
            console.warn(
                `[Billing] Ambiguous tariff match — multiple tariffs match "${studyType}". ` +
                `Using first match. Consider adding a studyType field to Case model for exact matching. ` +
                `Candidates: ${candidates.map(c => `${c.modality}/${c.studyType} (${c._id})`).join(', ')}`
            );
        }
        return candidates[0] || null;
    };

    // 1. Highly specific: Doctor + Hospital
    let match = pickWithAmbiguityCheck(tariffs.filter(t =>
        isModalityMatch(t) &&
        t.targetRadiologistId?.toString() === radiologistId?.toString() &&
        t.targetHospitalId === hospitalId &&
        isStudyMatch(t)
    ));

    // 2. Doctor specific (Global across hospitals)
    if (!match) {
        match = pickWithAmbiguityCheck(tariffs.filter(t =>
            isModalityMatch(t) &&
            t.targetRadiologistId?.toString() === radiologistId?.toString() &&
            !t.targetHospitalId &&
            isStudyMatch(t)
        ));
    }

    // 3. Hospital specific (Generic for any doctor)
    if (!match) {
        match = pickWithAmbiguityCheck(tariffs.filter(t =>
            isModalityMatch(t) &&
            !t.targetRadiologistId &&
            t.targetHospitalId === hospitalId &&
            isStudyMatch(t)
        ));
    }

    // 4. Global with specific studyType
    if (!match) {
        match = pickWithAmbiguityCheck(tariffs.filter(t =>
            isModalityMatch(t) &&
            !t.targetRadiologistId &&
            !t.targetHospitalId &&
            isStudyMatch(t)
        ));
    }

    // 5. Fallback to modality-only (General/Default)
    if (!match) {
        match = tariffs.find(t =>
            isModalityMatch(t) &&
            !t.targetRadiologistId &&
            !t.targetHospitalId &&
            (t.studyType === "General" || t.studyType === "Default" || t.studyType.toUpperCase() === normalizedModality.toUpperCase())
        );
    }

    // 6. ULTIMATE FALLBACK: Just match ANY tariff for this modality (global only)
    if (!match) {
        console.log(`[Tariff Match] No study match, using ANY tariff for modality "${normalizedModality}"`);
        match = tariffs.find(t => isModalityMatch(t) && !t.targetHospitalId && !t.targetRadiologistId);
    }

    if (!match) {
        console.log(`[Tariff Match] ✗ No match found at all`);
    } else {
        console.log(`[Tariff Match] ✓ Found: ${match.modality}/${match.studyType} - ₹${match.basePrice} (RuleID: ${match._id})`);
    }

    return match;
};

/**
 * Calculate total earning for a case based on a matched tariff
 */
export const calculateCaseEarning = (kase, tariff) => {
    if (!tariff) return { basePrice: 0, emergencySurcharge: 0, nightHolidaySurcharge: 0, total: 0, radiologistEarning: 0 };

    let basePrice = tariff.basePrice;
    let emergencySurcharge = 0;
    let nightHolidaySurcharge = 0;

    // 1. Emergency Surcharge (STAT)
    if (kase.urgency === "STAT") {
        emergencySurcharge = tariff.emergencySurcharge;
    }

    // 2. Night/Holiday Surcharge
    const finalizedDate = kase.report?.finalizedAt ? new Date(kase.report.finalizedAt) : new Date();
    const hour = finalizedDate.getHours();
    const day = finalizedDate.getDay(); // 0 is Sunday

    const isNight = hour >= 20 || hour < 8;
    const isHoliday = day === 0;

    if (isNight || isHoliday) {
        nightHolidaySurcharge = tariff.nightHolidaySurcharge;
    }

    const total = basePrice + emergencySurcharge + nightHolidaySurcharge;

    return {
        basePrice,
        emergencySurcharge,
        nightHolidaySurcharge,
        total,
        radiologistEarning: total // In this hospital's model, the full tariff price goes to the radiologist
    };
};
