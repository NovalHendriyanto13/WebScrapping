require('dotenv').config();

export const app_config = {
    app_port: process.env.APP_PORT || 3000,
    shopee_base_api: process.env.SHOPEE_BASE_API || ''
} 