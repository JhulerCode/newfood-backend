import { Client } from "minio";
import config from "../config.js";

export const minioClient = new Client({
    endPoint: config.MINIO_DOMAIN,
    useSSL: true,
    accessKey: config.MINIO_USER,
    secretKey: config.MINIO_PASSWORD,
    pathStyle: true
});

export const minioDomain = config.MINIO_DOMAIN;
export const minioBucket = config.MINIO_BUCKET;