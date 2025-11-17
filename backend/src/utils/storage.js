import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const WORKSHOPS_FILE = path.join(DATA_DIR, 'workshops.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load workshops from file
export const loadWorkshops = () => {
  try {
    if (fs.existsSync(WORKSHOPS_FILE)) {
      const data = fs.readFileSync(WORKSHOPS_FILE, 'utf-8');
      const workshops = JSON.parse(data);
      return new Map(Object.entries(workshops));
    }
  } catch (error) {
    console.error('Error loading workshops from file:', error);
  }
  return new Map();
};

// Save workshops to file
export const saveWorkshops = (workshopsMap) => {
  try {
    const workshopsObj = Object.fromEntries(workshopsMap);
    fs.writeFileSync(WORKSHOPS_FILE, JSON.stringify(workshopsObj, null, 2), 'utf-8');
    console.log(`Workshops saved to ${WORKSHOPS_FILE}`);
  } catch (error) {
    console.error('Error saving workshops to file:', error);
  }
};

// Save single workshop
export const saveWorkshop = (workshopsMap, workshopId) => {
  saveWorkshops(workshopsMap);
};

export default {
  loadWorkshops,
  saveWorkshops,
  saveWorkshop
};
