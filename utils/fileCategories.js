const path = require('path');

const CATEGORIES = {
    IMAGES: 'images',
    PDF: 'pdf',
    DOC: 'doc',
    PPT: 'ppt',
    OTHERS: 'others'
};

const EXTENSION_MAP = {
    images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'],
    pdf: ['.pdf'],
    doc: ['.doc', '.docx', '.txt', '.rtf', '.odt'],
    ppt: ['.ppt', '.pptx', '.odp'],
    others: ['.xls', '.xlsx', '.csv', '.zip', '.rar', '.7z', '.tar', '.gz', '.json', '.xml', '.mp3', '.mp4']
};

const DISALLOWED_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.msi', '.vbs', '.scr', '.com'];

/**
 * Determines category folder from file extension and mimetype.
 */
function getFileCategory(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (EXTENSION_MAP.images.includes(ext) || mime.startsWith('image/')) {
        return CATEGORIES.IMAGES;
    }
    if (EXTENSION_MAP.pdf.includes(ext) || mime === 'application/pdf') {
        return CATEGORIES.PDF;
    }
    if (EXTENSION_MAP.doc.includes(ext) || mime.includes('word') || mime.includes('text') || mime === 'application/msword') {
        return CATEGORIES.DOC;
    }
    if (EXTENSION_MAP.ppt.includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
        return CATEGORIES.PPT;
    }
    return CATEGORIES.OTHERS;
}

/**
 * Checks if a file is safe and allowed for upload.
 */
function isFileAllowed(file) {
    const ext = path.extname(file.originalname).toLowerCase();
    return !DISALLOWED_EXTENSIONS.includes(ext);
}

module.exports = {
    CATEGORIES,
    EXTENSION_MAP,
    getFileCategory,
    isFileAllowed
};
