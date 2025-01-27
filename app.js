const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const towerRoutes = require('./routes/towers');
require('dotenv').config();
const path = require('path');
const gemini = require('./gemini');

const app = express();
const port = 3000;

// Подключение к базе данных через Sequelize (настроено в db.js)
const sequelize = require('./db');
const Tower = require('./models/tower');
const User = require('./models/user'); // Модель пользователя

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Маршруты
app.use('/api/towers', towerRoutes);

// Регистрация пользователя
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Проверка, существует ли пользователь с таким email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Пользователь с таким email уже существует' });
    }

    // Создание нового пользователя (не забудь про хеширование пароля в реальном приложении!)
    const newUser = await User.create({ email, password });

    res.status(201).json({ message: 'Пользователь успешно зарегистрирован', userId: newUser.id });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({ message: 'Ошибка при регистрации' });
  }
});

// Вход пользователя
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Ищем пользователя по email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    // Сравниваем введенный пароль с паролем из базы данных
    // ВНИМАНИЕ: Здесь для простоты примера пароли сравниваются напрямую.
    // В реальном приложении нужно использовать bcrypt для хеширования и сравнения паролей!
    if (password === user.password) {
      res.status(200).json({ message: 'Вход выполнен успешно' });
    } else {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }
  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(500).json({ message: 'Ошибка при входе' });
  }
});

// Получение данных текущего пользователя
app.get('/api/user', async (req, res) => {
    try {
      // Извлекаем email из заголовка Authorization (предполагается, что он там будет после входа)
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: 'Не авторизован' });
      }
      
      const email = authHeader.split(' ')[1]; // Ожидаем формат "Bearer <email>"
  
      // Ищем пользователя по email
      const user = await User.findOne({ where: { email } });
  
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
  
      // Возвращаем данные пользователя (пока только email)
      res.status(200).json({ email: user.email });
    } catch (error) {
      console.error('Ошибка при получении данных пользователя:', error);
      res.status(500).json({ message: 'Ошибка при получении данных пользователя' });
    }
});

// Новый маршрут для расчета маршрута
app.post('/api/calculate-route', async (req, res) => {
    const { startTowerId, endTowerId } = req.body;

    try {
        const allTowers = await Tower.findAll();
        const startTower = allTowers.find(t => t.id == startTowerId);
        const endTower = allTowers.find(t => t.id == endTowerId);

        if (!startTower || !endTower) {
            return res.status(404).json({ message: 'Не удалось найти начальную или конечную вышку' });
        }

        const route = await calculateOptimalRoute(startTower, endTower, allTowers);
        const routeIds = route.map(tower => tower.id);

        // Добавляем данные о начальной и конечной вышке в объект routeData
        const routeData = {
            startTower: {
                id: startTower.id,
                lat: startTower.lat,
                lng: startTower.lng
            },
            endTower: {
                id: endTower.id,
                lat: endTower.lat,
                lng: endTower.lng
            },
            routeIds: routeIds
        };

        res.json({ routeIds, routeData });
    } catch (error) {
        console.error('Ошибка при расчете маршрута:', error);
        res.status(500).json({ message: 'Ошибка при расчете маршрута' });
    }
});

// Запрос к Gemini API
app.post('/api/gemini', async (req, res) => {
  const { routeData, userPrompt } = req.body;

  try {
    console.log("routeData in /api/gemini:", routeData); // Логируем routeData
    const description = await gemini.generateRouteDescription(routeData, userPrompt);
    res.status(200).json({ description });
  } catch (error) {
    console.error('Ошибка при запросе к Gemini:', error);
    res.status(500).json({ message: 'Ошибка при запросе к Gemini' });
  }
});

// Вспомогательные функции для расчета маршрута

async function calculateOptimalRoute(startTower, endTower, allTowers) {
    const visited = new Set();
    const route = [startTower];
    let currentTower = startTower;

    while (currentTower.id !== endTower.id) {
        visited.add(currentTower.id);
        let nearestTower = null;
        let minDistance = Infinity;

        for (const tower of allTowers) {
            if (!visited.has(tower.id)) {
                const distance = getDistance(currentTower, tower);
                
                // Учитываем статус вышки
                const statusValue = getTowerStatusValue(tower.status).value;
                if (statusValue === 0) continue; // Пропускаем неработающие вышки

                const weightedDistance = distance / statusValue; // Штрафуем за неактивные вышки

                if (weightedDistance < minDistance) {
                    minDistance = weightedDistance;
                    nearestTower = tower;
                }
            }
        }

        if (!nearestTower) {
            // Не нашли следующую вышку
            throw new Error('Не удалось построить маршрут до конечной вышки');
        }

        route.push(nearestTower);
        currentTower = nearestTower;
    }

    return route;
}

function getDistance(tower1, tower2) {
    const dx = tower1.lat - tower2.lat;
    const dy = tower1.lng - tower2.lng;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTowerStatusValue(status) {
    switch (status) {
        case 'overload': return { value: 0.8, description: 'Перегружена' }; // Штраф за перегрузку
        case 'accident': return { value: 0, description: 'Не работает' };   // Вышка не работает
        case 'free': return { value: 1.2, description: 'Свободна' };     // Бонус за свободную вышку
        case 'active': return { value: 1, description: 'Активна' };     // Обычный статус
        default: return { value: 1, description: 'Неизвестно' };
    }
}

// Отдача статических файлов (HTML, CSS, JS) из текущей директории
app.use(express.static(path.join(__dirname, '.')));

// Отдача index.html при запросе к корню
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Отдача towers.html при запросе к /towers
app.get('/towers', (req, res) => {
  res.sendFile(path.join(__dirname, 'towers.html'));
});

// Проверка подключения и запуск сервера
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    // Синхронизация моделей с базой данных
    await sequelize.sync({ alter: true });
    console.log("All models were synchronized successfully.");
    app.listen(port, () => {
      console.log(`Сервер запущен на порту ${port}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

startServer();