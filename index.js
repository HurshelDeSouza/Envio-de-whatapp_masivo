/**
 * Punto de entrada de la aplicación
 * WhatsApp Bulk Message Sender
 * 
 * Arquitectura basada en principios SOLID:
 * - Single Responsibility: Cada clase tiene una única responsabilidad
 * - Open/Closed: Abierto para extensión, cerrado para modificación
 * - Liskov Substitution: Las clases pueden ser sustituidas por sus implementaciones
 * - Interface Segregation: Interfaces específicas y pequeñas
 * - Dependency Inversion: Dependencias de abstracciones, no de implementaciones concretas
 */

const App = require('./src/App');

const app = new App();
app.run();
