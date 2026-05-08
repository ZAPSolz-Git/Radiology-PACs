import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.js';
import Case from '../models/Case.js';
import Tariff from '../models/Tariff.js';
import Payout from '../models/Payout.js';
import { findMatchingTariff, calculateCaseEarning } from '../utils/billingUtils.js';

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const tariffs = await Tariff.find({}).lean();
    console.log(`Found ${tariffs.length} tariffs`);
    tariffs.forEach(t => {
        console.log(`Tariff: ${t.modality} ${t.studyType} - targetDoctor: ${t.targetRadiologistId} - basePrice: ${t.basePrice} - doctorFee: ${t.doctorFee} - doctorPercentage: ${t.doctorPercentage}`);
    });

    const cases = await Case.find({ status: "Finalized" }).populate("assignedRadiologist");
    console.log(`Found ${cases.length} finalized cases`);
    let updated = 0;

    for (let kase of cases) {
        if (!kase.billingInfo) {
            kase.billingInfo = {};
        }

        // If it has a total but no radiologistEarning, or if we want to recalculate
        const matched = findMatchingTariff(tariffs, kase.modality, kase.bodyPart, kase.institution, kase.assignedRadiologist ? kase.assignedRadiologist._id : null);
        if (matched) {
            const earnings = calculateCaseEarning(kase, matched);
            console.log(`Case ${kase._id} (Modality ${kase.modality}) recalculating rad earning to ${earnings.total}`);
            // Update it to correct value
            kase.billingInfo.radiologistEarning = earnings.total;
            kase.billingInfo.basePrice = earnings.basePrice;
            kase.billingInfo.total = earnings.total;
            kase.billingInfo.tariffId = matched._id;

            // Mark modified
            kase.markModified("billingInfo");
            await kase.save();
            updated++;
        } else {
            console.log(`Case ${kase._id} (Modality ${kase.modality}) found no tariff.`);
        }
    }

    console.log(`Updated ${updated} cases.`);

    // Recalculate payouts amounts
    const payouts = await Payout.find({});
    for (let p of payouts) {
        let amt = 0;
        const payoutCases = await Case.find({ _id: { $in: p.cases } });
        for (let c of payoutCases) {
            amt += (c.billingInfo?.radiologistEarning || 0);
        }
        console.log(`Payout ${p._id}: updating amount from ${p.amount} to ${amt}`);
        p.amount = amt;
        await p.save();
    }

    console.log("Done");
    process.exit(0);
}

run().catch(console.error);
