const day = value => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(value);

export function assertFreshANMReceipt(headers, now = new Date()) {
    const downloaded = Date.parse(headers['x-anm-downloaded-at']);
    const validated = Date.parse(headers['x-anm-validated-at']);
    const sha256 = headers['x-anm-sha256'];
    const bytes = Number(headers['x-anm-bytes']);
    if (!Number.isFinite(downloaded) || !Number.isFinite(validated) ||
        !/^[a-f0-9]{64}$/.test(sha256 || '') || !Number.isSafeInteger(bytes) || bytes <= 0 ||
        downloaded > validated || validated > now.getTime() + 60000 ||
        day(downloaded) !== day(now) || day(validated) !== day(now)) {
        throw new Error('ANM source not downloaded and validated today in America/Sao_Paulo; preserving active data');
    }
    return { downloadedAt: new Date(downloaded).toISOString(), validatedAt: new Date(validated).toISOString(), sha256, bytes };
}
