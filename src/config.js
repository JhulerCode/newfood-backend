import { config } from 'dotenv'

config()

export default {
    hostFrontend: process.env.HOST_FRONTEND || '',
    APP_VERSION: process.env.APP_VERSION || '',
    tokenMyApi: process.env.TOKEN_MY_API || '',

    dbUri: process.env.DB_URI || '',

    resendApiKey: process.env.RESEND_API_KEY || '',

    decolectaApiKey: process.env.DECOLECTA_API_KEY || '',

    mifactApiKey: process.env.MIFACT_API_KEY || '',

    MINIO_DOMAIN: process.env.MINIO_DOMAIN || '',
    MINIO_USER: process.env.MINIO_USER || '',
    MINIO_PASSWORD: process.env.MINIO_PASSWORD || '',
    MINIO_BUCKET: process.env.MINIO_BUCKET || '',
}