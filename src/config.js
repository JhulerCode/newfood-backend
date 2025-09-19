import { config } from 'dotenv'

config()

export default {
    hostFrontend: process.env.HOST_FRONTEND || '',
    tokenMyApi: process.env.TOKEN_MY_API || '',

    dbUri: process.env.DB_URI || '',

    resendApiKey: process.env.RESEND_API_KEY || '',

    decolectaApiKey: process.env.DECOLECTA_API_KEY || '',
    
    mifactApiKey: process.env.MIFACT_API_KEY || '',
}