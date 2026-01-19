function resUpdateFalse(res) {
    res.json({ code: 1, msg: 'No se actualizó ningún registro' })
}

function resDeleteFalse(res) {
    res.json({ code: 1, msg: 'No se eliminó ningún registro' })
}

export {
    resUpdateFalse,
    resDeleteFalse,
}