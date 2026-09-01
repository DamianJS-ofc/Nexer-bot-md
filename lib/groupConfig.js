import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GROUPS_CONFIG_FILE = path.join(__dirname, '..', 'databases', 'groups_config.json');

let cache = null;
let lastLoad = 0;

const ensureDbFolder = () => {
    const dbDir = path.join(__dirname, '..', 'databases');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
};

export const loadGroupsConfig = () => {
    try {
        // cache 3 segundos
        if (cache && Date.now() - lastLoad < 3000) return cache;
        ensureDbFolder();
        if (fs.existsSync(GROUPS_CONFIG_FILE)) {
            const data = fs.readFileSync(GROUPS_CONFIG_FILE, 'utf8');
            cache = JSON.parse(data);
            if (!cache.groups) cache.groups = {};
        } else {
            cache = { groups: {} };
        }
        lastLoad = Date.now();
        return cache;
    } catch (e) {
        console.error('Error cargando groups_config:', e.message);
        return { groups: {} };
    }
};

export const saveGroupsConfig = (config) => {
    try {
        ensureDbFolder();
        fs.writeFileSync(GROUPS_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        cache = config;
        lastLoad = Date.now();
        return true;
    } catch (e) {
        console.error('Error guardando groups_config:', e.message);
        return false;
    }
};

export const getGroupConfig = (groupId) => {
    if (!groupId) return { botEnabled: true, onlyadmin: false };
    const config = loadGroupsConfig();
    if (!config.groups[groupId]) {
        config.groups[groupId] = {
            botEnabled: true,
            onlyadmin: false
        };
        saveGroupsConfig(config);
    }
    return config.groups[groupId];
};

export const updateGroupConfig = (groupId, updates) => {
    if (!groupId) return null;
    const config = loadGroupsConfig();
    if (!config.groups[groupId]) {
        config.groups[groupId] = { botEnabled: true, onlyadmin: false };
    }
    config.groups[groupId] = {...config.groups[groupId],...updates };
    saveGroupsConfig(config);
    return config.groups[groupId];
};