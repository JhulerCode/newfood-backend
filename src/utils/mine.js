import { Op } from 'sequelize'

async function existe(model, where, res, ms) {
    if (where.id) {
        where.id = { [Op.not]: where.id }
    }

    const result = await model.findAll({ where })

    if (result.length > 0) {
        res.json({ code: 1, msg: ms ? ms : 'El nombre ya existe' })
        return true
    }
}

function applyFilters(filters) {
    const whereClause = {}

    Object.keys(filters).forEach((key) => {
        const { op, val, val1 } = filters[key]

        switch (op) {
            case 'Es':
                whereClause[key] = val;
                break;
            case 'No es':
                whereClause[key] = { [Op.ne]: val };
                break;
            case 'Contiene':
                whereClause[key] = { [Op.iLike]: `%${val}%` };
                break;
            case 'No contiene':
                whereClause[key] = { [Op.notLike]: `%${val}%` };
                break;
            case 'Empieza con':
                whereClause[key] = { [Op.iLike]: `${val}%` };
                break;
            case 'Termina con':
                whereClause[key] = { [Op.iLike]: `%${val}` };
                break;
            case 'Está vacío':
                whereClause[key] = { [Op.is]: null };
                break;
            case 'No está vacío':
                whereClause[key] = { [Op.not]: null };
                break;
            case 'Es anterior a':
                whereClause[key] = { [Op.lt]: val };
                break;
            case 'Es posterior a':
                whereClause[key] = { [Op.gt]: val };
                break;
            case 'Es igual o anterior a':
                whereClause[key] = { [Op.lte]: val };
                break;
            case 'Es igual o posterior a':
                whereClause[key] = { [Op.gte]: val };
                break;
            case 'Está dentro de':
                whereClause[key] = { [Op.between]: [val, val1] };
                break;
            case '=':
                whereClause[key] = val;
                break;
            case '!=':
                whereClause[key] = { [Op.ne]: val };
                break;
            case '<':
                whereClause[key] = { [Op.lt]: val };
                break;
            case '>':
                whereClause[key] = { [Op.gt]: val };
                break;
            case '<=':
                whereClause[key] = { [Op.lte]: val };
                break;
            case '>=':
                whereClause[key] = { [Op.gte]: val };
                break;
            default:
                break;
        }
    });

    return whereClause
}

function cleanFloat(num) {
    return Math.round((num + Number.EPSILON) * 1e12) / 1e12;
}

function redondear(num, dec = 2) {
    if (num === null || num === undefined) return num

    return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec
    })
}

function numeroATexto(num) {
    const unidades = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
    const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const especiales = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
    const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

    function convertir(n) {
        if (n < 10) return unidades[n];
        if (n < 20) return especiales[n - 10];
        if (n < 100) return decenas[Math.floor(n / 10)] + (n % 10 === 0 ? "" : " Y " + unidades[n % 10]);
        if (n < 1000) return (n === 100 ? "CIEN" : centenas[Math.floor(n / 100)]) + (n % 100 === 0 ? "" : " " + convertir(n % 100));
        if (n < 1000000) return (n < 2000 ? "MIL" : convertir(Math.floor(n / 1000)) + " MIL") + (n % 1000 === 0 ? "" : " " + convertir(n % 1000));
        if (n < 1000000000) return convertir(Math.floor(n / 1000000)) + " MILLONES" + (n % 1000000 === 0 ? "" : " " + convertir(n % 1000000));
        return "";
    }

    const parteEntera = Math.floor(num);
    const parteDecimal = Math.round((num - parteEntera) * 100);

    const textoEntero = convertir(parteEntera);
    const textoDecimal = parteDecimal < 10 ? "0" + parteDecimal : parteDecimal;

    return `${textoEntero} CON ${textoDecimal}/100`;
}

export {
    existe,
    applyFilters,
    cleanFloat,
    redondear,
    numeroATexto,
}