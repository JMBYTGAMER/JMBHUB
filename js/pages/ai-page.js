import {APP_CONFIG} from '../config/app-config.js';
import {guard} from '../core/auth-guard.js';
await guard();
document.querySelector('#aiOpen').href=APP_CONFIG.AI_URL;
