import pydicom
import os
from collections import defaultdict

CASES_DIR = r"C:\Users\admin\Desktop\Varun\Radiology-Project\backend\uploads\cases"

def analyze_all_cases():
    TARGET_NUMS = ['98001', '838254', '145319002', '98000', '145319001', '145319089', '492747', '151923', '592436', '890000']
    
    for case_folder in os.listdir(CASES_DIR):
        case_path = os.path.join(CASES_DIR, case_folder)
        if not os.path.isdir(case_path): continue
        
        dicom_dir = os.path.join(case_path, 'dicom')
        if not os.path.exists(dicom_dir): continue
        
        print(f"\nScanning Case: {case_folder}")
        series_data = defaultdict(list)
        
        files = [f for f in os.listdir(dicom_dir) if f.endswith('.dcm')]
        for filename in files:
            path = os.path.join(dicom_dir, filename)
            try:
                ds = pydicom.dcmread(path, stop_before_pixels=True)
                series_num = str(getattr(ds, 'SeriesNumber', 'Unknown'))
                series_desc = getattr(ds, 'SeriesDescription', 'Unknown')
                uid = ds.SeriesInstanceUID
                
                z_pos = ds.ImagePositionPatient[2] if hasattr(ds, 'ImagePositionPatient') else None
                thickness = getattr(ds, 'SliceThickness', 0)
                instance = getattr(ds, 'InstanceNumber', 0)
                
                meta_str = f"{series_num} {series_desc} {uid} {getattr(ds, 'ProtocolName', '')}"
                
                series_data[uid].append({
                    'z': z_pos,
                    'thickness': thickness,
                    'instance': instance,
                    'num': series_num,
                    'desc': series_desc,
                    'meta': meta_str
                })
            except Exception:
                pass
                
        for uid, slices in series_data.items():
            if len(slices) < 2: continue
            slices.sort(key=lambda x: x['z'] if x['z'] is not None else 0)
            
            meta = slices[0]['meta']
            is_target = any(num in meta for num in TARGET_NUMS)
            
            if is_target:
                print(f"  MATCH in Series {slices[0]['num']} ({slices[0]['desc']})")
                print(f"  Metadata: {meta}")
                
                gaps = 0
                for i in range(1, len(slices)):
                    z1 = slices[i-1]['z']
                    z2 = slices[i]['z']
                    thickness = slices[i]['thickness']
                    if z1 is None or z2 is None: continue
                    diff = abs(z2 - z1)
                    if thickness > 0 and diff > thickness * 1.5:
                        gaps += 1
                        print(f"    GAP: Z1={z1:.1f}, Z2={z2:.1f}, Diff={diff:.1f}, Thickness={thickness:.1f} (I: {slices[i-1]['instance']}->{slices[i]['instance']})")
                print(f"  Total Gaps: {gaps}")

if __name__ == "__main__":
    analyze_all_cases()
