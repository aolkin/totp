const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const DEFAULT_PASSPHRASE = 'NO_PASSPHRASE';

const WORDLIST = [
    'apple', 'ocean', 'river', 'cloud', 'storm', 'flame', 'frost', 'dream', 'light', 'shade',
    'stone', 'brook', 'grove', 'field', 'bloom', 'north', 'south', 'swift', 'brave', 'calm',
    'azure', 'coral', 'amber', 'ivory', 'jade', 'pearl', 'ruby', 'slate', 'teal', 'violet',
    'anchor', 'bridge', 'castle', 'delta', 'eagle', 'falcon', 'garden', 'harbor', 'island', 'jungle',
    'knight', 'legend', 'meadow', 'noble', 'orbit', 'palace', 'quest', 'raven', 'summit', 'tower',
    'ultra', 'valley', 'wonder', 'zenith', 'arrow', 'beacon', 'crystal', 'dusk', 'ember', 'forest',
    'glacier', 'horizon', 'jasper', 'kayak', 'lunar', 'marble', 'nectar', 'opal', 'prism', 'quartz',
    'rapids', 'sunset', 'thunder', 'voyage', 'willow', 'yacht', 'zephyr', 'atlas', 'blaze', 'cipher',
    'drift', 'equinox', 'flora', 'glow', 'halo', 'indigo', 'journey', 'karma', 'lotus', 'mirage',
    'nimbus', 'omega', 'phoenix', 'quiver', 'realm', 'sphinx', 'tropic', 'unity', 'vortex', 'whirl',
    'alpha', 'beta', 'gamma', 'crown', 'sigma', 'echo', 'theta', 'kappa', 'lambda', 'nova',
    'maple', 'cedar', 'birch', 'aspen', 'olive', 'palm', 'pine', 'oak', 'elm', 'fir',
    'coast', 'shore', 'beach', 'cliff', 'cove', 'reef', 'wave', 'tide', 'surf', 'foam'
];

class TOTPApp {
    constructor() {
        this.elements = {};
        this.isCustomPassphrase = false;
        this.currentConfig = null;
        this.intervalId = null;
        this.deferredPrompt = null;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.checkBrowserSupport();
        this.setupPWA();
        this.handleRoute();
    }

    cacheElements() {
        const ids = [
            'createView', 'unlockView', 'displayView', 'errorView',
            'createForm', 'secret', 'label', 'passphrase', 'regenerateBtn',
            'passphraseHelp', 'strengthMeter', 'strengthBar', 'strengthText',
            'secretError', 'passphraseError', 'digits', 'period', 'algorithm',
            'result', 'generatedUrl', 'copyUrlBtn', 'passphraseDisplay', 'savedPassphrase',
            'createAnotherBtn', 'unlockForm', 'unlockPassphrase', 'unlockError',
            'totpLabel', 'totpCode', 'countdown', 'countdownCircle', 'copyCodeBtn',
            'errorMessage', 'installBtn', 'toast'
        ];
        ids.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });
    }

    bindEvents() {
        this.elements.createForm.addEventListener('submit', e => this.handleCreate(e));
        this.elements.regenerateBtn.addEventListener('click', () => this.regeneratePassphrase());
        this.elements.passphrase.addEventListener('input', () => this.handlePassphraseInput());
        this.elements.copyUrlBtn.addEventListener('click', () => this.copyUrl());
        this.elements.createAnotherBtn.addEventListener('click', () => this.resetForm());
        this.elements.unlockForm.addEventListener('submit', e => this.handleUnlock(e));
        this.elements.copyCodeBtn.addEventListener('click', () => this.copyCode());
        this.elements.installBtn.addEventListener('click', () => this.installPWA());
    }

    checkBrowserSupport() {
        if (!window.crypto || !window.crypto.subtle) {
            this.showError('Your browser does not support the required cryptographic features. Please use a modern browser.');
        }
    }

    setupPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
        window.addEventListener('beforeinstallprompt', e => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.elements.installBtn.classList.remove('hidden');
        });
    }

    async installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            await this.deferredPrompt.userChoice;
            this.deferredPrompt = null;
            this.elements.installBtn.classList.add('hidden');
        }
    }

    handleRoute() {
        const fragment = window.location.hash.slice(1);
        if (fragment) {
            this.showView('unlockView');
            this.tryAutoDecrypt(fragment);
        } else {
            this.showView('createView');
            this.regeneratePassphrase();
        }
    }

    showView(viewId) {
        ['createView', 'unlockView', 'displayView', 'errorView'].forEach(id => {
            this.elements[id].classList.add('hidden');
        });
        this.elements[viewId].classList.remove('hidden');
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.showView('errorView');
    }

    showToast(message) {
        this.elements.toast.textContent = message;
        this.elements.toast.classList.remove('hidden');
        setTimeout(() => this.elements.toast.classList.add('hidden'), 2000);
    }

    regeneratePassphrase() {
        const words = [];
        const array = new Uint32Array(5);
        crypto.getRandomValues(array);
        for (let i = 0; i < 5; i++) {
            words.push(WORDLIST[array[i] % WORDLIST.length]);
        }
        this.elements.passphrase.value = words.join('-');
        this.isCustomPassphrase = false;
        this.elements.passphraseHelp.textContent = 'Generated phrase - edit for custom';
        this.elements.strengthMeter.classList.add('hidden');
        this.elements.passphraseError.classList.add('hidden');
    }

    handlePassphraseInput() {
        this.isCustomPassphrase = true;
        this.elements.passphraseHelp.textContent = 'Custom passphrase';
        const value = this.elements.passphrase.value;
        if (value.length > 0) {
            this.updateStrengthMeter(value);
        } else {
            this.elements.strengthMeter.classList.add('hidden');
        }
    }

    updateStrengthMeter(passphrase) {
        this.elements.strengthMeter.classList.remove('hidden');
        const length = passphrase.length;
        const hasUpper = /[A-Z]/.test(passphrase);
        const hasLower = /[a-z]/.test(passphrase);
        const hasNumber = /[0-9]/.test(passphrase);
        const hasSpecial = /[^A-Za-z0-9]/.test(passphrase);
        const variety = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
        let strength = 'weak';
        let text = 'Weak';
        if (length >= 16 && variety >= 3) {
            strength = 'strong';
            text = 'Strong';
        } else if (length >= 12 && variety >= 2) {
            strength = 'medium';
            text = 'Medium';
        }
        this.elements.strengthBar.className = 'strength-bar ' + strength;
        this.elements.strengthText.textContent = text;
    }

    validateBase32(secret) {
        const cleaned = secret.replace(/\s+/g, '').toUpperCase();
        return /^[A-Z2-7]+=*$/.test(cleaned) ? cleaned : null;
    }

    async handleCreate(e) {
        e.preventDefault();
        this.elements.secretError.classList.add('hidden');
        this.elements.passphraseError.classList.add('hidden');
        const secretInput = this.elements.secret.value;
        const cleanedSecret = this.validateBase32(secretInput);
        if (!cleanedSecret) {
            this.elements.secretError.textContent = 'Invalid format. Use Base32 characters (A-Z, 2-7).';
            this.elements.secretError.classList.remove('hidden');
            return;
        }
        const passphrase = this.elements.passphrase.value;
        if (this.isCustomPassphrase && passphrase.length > 0 && passphrase.length < 12) {
            this.elements.passphraseError.textContent = 'Custom passphrase must be at least 12 characters.';
            this.elements.passphraseError.classList.remove('hidden');
            return;
        }
        const config = {
            s: cleanedSecret,
            l: this.elements.label.value || undefined,
            d: parseInt(this.elements.digits.value),
            p: parseInt(this.elements.period.value),
            a: this.elements.algorithm.value
        };
        if (config.d === 6) delete config.d;
        if (config.p === 30) delete config.p;
        if (config.a === 'SHA1') delete config.a;
        if (!config.l) delete config.l;
        try {
            const effectivePassphrase = passphrase || DEFAULT_PASSPHRASE;
            const encrypted = await this.encrypt(JSON.stringify(config), effectivePassphrase);
            const url = window.location.origin + window.location.pathname + '#' + encrypted;
            this.elements.generatedUrl.value = url;
            if (passphrase) {
                this.elements.savedPassphrase.textContent = passphrase;
                this.elements.passphraseDisplay.classList.remove('hidden');
            } else {
                this.elements.passphraseDisplay.classList.add('hidden');
            }
            this.elements.result.classList.remove('hidden');
            this.elements.createForm.classList.add('hidden');
        } catch (err) {
            this.showToast('Encryption failed');
        }
    }

    async encrypt(plaintext, passphrase) {
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);
        const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );
        const ciphertext = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );
        const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
        combined.set(salt, 0);
        combined.set(iv, salt.length);
        combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
        return this.base64UrlEncode(combined);
    }

    async decrypt(encoded, passphrase) {
        const combined = this.base64UrlDecode(encoded);
        const salt = combined.slice(0, SALT_LENGTH);
        const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(passphrase),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );
        return new TextDecoder().decode(decrypted);
    }

    base64UrlEncode(bytes) {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    base64UrlDecode(str) {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    async tryAutoDecrypt(fragment) {
        try {
            const plaintext = await this.decrypt(fragment, DEFAULT_PASSPHRASE);
            this.currentConfig = JSON.parse(plaintext);
            this.showTOTP();
        } catch {
            this.showView('unlockView');
        }
    }

    async handleUnlock(e) {
        e.preventDefault();
        const passphrase = this.elements.unlockPassphrase.value;
        const fragment = window.location.hash.slice(1);
        this.elements.unlockError.classList.add('hidden');
        try {
            const plaintext = await this.decrypt(fragment, passphrase);
            this.currentConfig = JSON.parse(plaintext);
            this.showTOTP();
        } catch {
            this.elements.unlockError.textContent = 'Incorrect passphrase';
            this.elements.unlockError.classList.remove('hidden');
        }
    }

    showTOTP() {
        this.showView('displayView');
        const config = this.currentConfig;
        if (config.l) {
            this.elements.totpLabel.textContent = config.l;
        }
        this.updateTOTP();
        this.startCountdown();
    }

    updateTOTP() {
        const config = this.currentConfig;
        const totp = new OTPAuth.TOTP({
            secret: OTPAuth.Secret.fromBase32(config.s),
            digits: config.d || 6,
            period: config.p || 30,
            algorithm: config.a || 'SHA1'
        });
        const code = totp.generate();
        this.elements.totpCode.textContent = code;
    }

    startCountdown() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        const period = this.currentConfig.p || 30;
        const circumference = 2 * Math.PI * 45;
        const update = () => {
            const now = Math.floor(Date.now() / 1000);
            const remaining = period - (now % period);
            this.elements.countdown.textContent = remaining;
            const offset = circumference * (1 - remaining / period);
            this.elements.countdownCircle.style.strokeDashoffset = offset;
            if (remaining === period) {
                this.updateTOTP();
            }
        };
        update();
        this.intervalId = setInterval(update, 1000);
    }

    copyUrl() {
        navigator.clipboard.writeText(this.elements.generatedUrl.value).then(() => {
            this.showToast('URL copied to clipboard');
        });
    }

    copyCode() {
        navigator.clipboard.writeText(this.elements.totpCode.textContent).then(() => {
            this.showToast('Code copied to clipboard');
        });
    }

    resetForm() {
        this.elements.createForm.reset();
        this.elements.createForm.classList.remove('hidden');
        this.elements.result.classList.add('hidden');
        this.regeneratePassphrase();
    }
}

new TOTPApp();
