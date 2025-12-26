# DPFOffService Vehicle Database Extractor

## Overview
This script extracts the **complete vehicle database** from dpfoffservice.com, including:
- All vehicle types (Car, Truck, Bus, Agriculture, Construction, Marine)
- All brands (80+ brands including Japanese imports)
- All models
- All engines
- All ECU types

## Requirements

- Python 3.8 or higher
- Playwright library

## Installation

### Step 1: Install Python (if not already installed)
- Windows: Download from https://python.org
- Mac: `brew install python3`
- Linux: `sudo apt install python3 python3-pip`

### Step 2: Install Playwright

```bash
pip install playwright
playwright install chromium
```

### Step 3: Download the Script

Save the `dpf_database_extractor.py` file to your computer.

## Usage

### Option 1: Run with visible browser (recommended for first run)

```bash
python dpf_database_extractor.py
```

This opens a browser window so you can see the extraction progress.

### Option 2: Run in background (headless)

Edit the script and change line 226:
```python
headless=True,  # Change from False to True
```

Then run:
```bash
python dpf_database_extractor.py
```

## What Happens

1. **Login**: The script logs into dpfoffservice.com using your credentials
2. **Navigation**: Opens the "Process File" section
3. **Extraction**: Iterates through:
   - Each vehicle type
   - Each brand
   - Each model
   - Each engine
   - Gets all ECU types

4. **Saving**: Progress is saved every few brands, so you can:
   - Stop at any time (Ctrl+C)
   - Resume later by running the script again

## Output Files

### dpf_complete_database.json
The complete database in JSON format:

```json
{
  "vehicle_types": [...],
  "Car": {
    "brands": {
      "Toyota": {
        "id": "155",
        "models": {
          "Hiace": {
            "id": "2278",
            "engines": {
              "2.8 D-4D": {
                "id": "12525",
                "ecus": [
                  {"id": "20164", "name": "Denso NEC Gen 3"}
                ]
              }
            }
          }
        }
      }
    }
  },
  "Truck": {
    "brands": {
      "Hino": {...},
      "Isuzu": {...}
    }
  }
}
```

### dpf_extraction_progress.json
Tracks which brands have been completed (for resume capability).

## Estimated Time

- Full extraction: **2-4 hours**
- Japanese brands only: **30-60 minutes**

## Tips

1. **Stable Internet**: Use a stable internet connection
2. **Don't close browser**: Let the script control the browser
3. **Resume anytime**: If it crashes, just run again to continue
4. **Check progress**: Look at the terminal output for live progress

## Troubleshooting

### "playwright not installed"
```bash
pip install playwright
playwright install chromium
```

### "Login failed"
- Check your credentials in the script
- Make sure you can log in manually first

### Script crashes frequently
- Increase delay values at the top of the script
- Change `DELAY_AFTER_BRAND_CHANGE = 3000` (3 seconds)

### Browser closes immediately
- Make sure you have Chromium installed:
  ```bash
  playwright install chromium
  ```

## After Extraction

Once you have the `dpf_complete_database.json` file, share it with me and I will:
1. Import it into your ECU Flash Service app
2. Update the vehicle selection dropdowns
3. Map ECU types to service capabilities (DPF, EGR, AdBlue)

## Support

If you have any issues, share:
1. The error message
2. Your Python version: `python --version`
3. The last few lines of terminal output
