import { config } from 'dotenv'

config()

export default {
    hostFrontend: process.env.HOST_FRONTEND || '',
    tokenMyApi: process.env.TOKEN_MY_API || '',
    
    dbUri: process.env.DB_URI || '',
}