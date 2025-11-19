# Sistema de Gestión de Biblioteca

Este proyecto es una aplicación web desarrollada con Node.js y Express que implementa un sistema completo de gestión bibliotecaria con autenticación de usuarios y control de acceso basado en roles.

## Descripción

El sistema permite administrar un catálogo de libros y sus préstamos mediante una interfaz web intuitiva. Cuenta con dos tipos de usuarios: administradores, quienes tienen acceso completo a todas las funcionalidades incluyendo reportes y configuración del sistema, y usuarios normales, que pueden gestionar libros y préstamos pero no tienen acceso a las herramientas administrativas.

La autenticación se maneja mediante sesiones seguras que expiran automáticamente después de 30 minutos de inactividad. Los usuarios no autenticados son redirigidos automáticamente a la página de inicio de sesión al intentar acceder a cualquier ruta protegida.

## Tecnologías

El backend está construido con Node.js y Express.js, utilizando MongoDB como base de datos a través de Mongoose como ODM. Las vistas se renderizan del lado del servidor usando EJS como motor de plantillas. Las sesiones se gestionan con express-session y los datos se almacenan en MongoDB Atlas para producción.


## Funcionalidades

El sistema implementa operaciones CRUD completas para libros y préstamos. Los usuarios pueden crear, leer, actualizar y eliminar registros según sus permisos. El panel administrativo proporciona estadísticas en tiempo real sobre el inventario de libros, préstamos activos y usuarios del sistema. La configuración permite ajustar parámetros como los días máximos de préstamo, que se aplica automáticamente al crear nuevos préstamos.


