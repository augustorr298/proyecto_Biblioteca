const usuarios = [
    {
        id: 1,
        username: "admin",
        password: "admin123",
        role: "administrador"
    },
    {
        id: 2,
        username: "usuario",
        password: "user123",
        role: "normal"
    }
];

export const verificarUsuario = (username, password) => {
    return usuarios.find(u => u.username === username && u.password === password);
};