export const verificarSesion = (req, res, next) => {
    if (req.session.usuario) {
        next();
    } else {
        res.redirect("/");
    }
};

export const verificarAdmin = (req, res, next) => {
    if (req.session.usuario && req.session.usuario.role === "administrador") {
        next();
    } else {
        res.status(403).send("Acceso denegado: Solo administradores");
    }
};

export const verificarUsuarioNormal = (req, res, next) => {
    if (req.session.usuario && (req.session.usuario.role === "normal" || req.session.usuario.role === "administrador")) {
        next();
    } else {
        res.status(403).send("Acceso denegado: Necesitas ser usuario registrado");
    }
};