import multer from 'multer'

const uploadMem = multer({ storage: multer.memoryStorage() });

export {
    uploadMem,
}