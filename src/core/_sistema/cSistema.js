import { sistemaData } from '#store/system.js'

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null
        const data = {}

        if (qry) {
            for (const a of qry) {
                data[a] = sistemaData[a]
            }
        }

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

export default {
    find,
}