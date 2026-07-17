import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

import config from '../../config.js'

export const r2Client = new S3Client({
    region: 'auto',
    endpoint: config.R2_ENDPOINT,
    credentials: {
        accessKeyId: config.R2_ACCESS_KEY_ID,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
})

export const r2Bucket = config.R2_BUCKET
export const r2PublicDomain = config.R2_PUBLIC_DOMAIN

function sanitizeFileName(fileName) {
    return fileName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^\w.-]/g, '')
}

export async function r2PutObject(file) {
    try {
        const timestamp = Date.now()
        const sanitizedName = sanitizeFileName(file.originalname)
        const uniqueName = `${timestamp}-${sanitizedName}`

        const command = new PutObjectCommand({
            Bucket: r2Bucket,
            Key: uniqueName,
            Body: file.buffer,
            ContentLength: file.size,
            ContentType: file.mimetype,
            CacheControl: 'public, max-age=31536000, immutable',
        })

        await r2Client.send(command)

        return {
            id: uniqueName,
            name: file.originalname,
            url: `https://${r2PublicDomain}/${uniqueName}`,
        }
    } catch (error) {
        console.error('Error al subir archivo a R2:', error.message)
        return false
    }
}

export async function r2RemoveObject(id) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: r2Bucket,
            Key: id,
        })

        await r2Client.send(command)

        return true
    } catch (error) {
        console.error(`Error al eliminar ${id} de R2:`, error.message)
        return false
    }
}
