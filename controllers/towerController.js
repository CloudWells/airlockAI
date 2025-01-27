const Tower = require('../models/tower');

// Создание новой вышки
exports.createTower = async (req, res) => {
  try {
    console.log('createTower - req.body:', req.body);
    const { lat, lng, photo, operators, status, notes } = req.body;
    // operators теперь строка
    const tower = await Tower.create({ lat, lng, photo, operators, status, notes });
    console.log('createTower - tower created:', tower);
    res.status(201).json(tower);
  } catch (err) {
    console.error('createTower - error:', err);
    res.status(500).json({ message: 'Ошибка при создании вышки' });
  }
};

// Получение всех вышек
exports.getAllTowers = async (req, res) => {
  try {
    const towers = await Tower.findAll();
    res.json(towers);
  } catch (err) {
    console.error('getAllTowers - error:', err);
    res.status(500).json({ message: 'Ошибка при получении вышек' });
  }
};

// Получение информации о вышке по ID
exports.getTowerById = async (req, res) => {
  try {
    const towerId = req.params.id;
    const tower = await Tower.findByPk(towerId);
    if (!tower) {
      return res.status(404).json({ message: 'Вышка не найдена' });
    }
    res.json(tower);
  } catch (err) {
    console.error('getTowerById - error:', err);
    res.status(500).json({ message: 'Ошибка при получении информации о вышке' });
  }
};

// Обновление информации о вышке
exports.updateTower = async (req, res) => {
  try {
    const towerId = req.params.id;
    console.log('updateTower - towerId:', towerId);
    console.log('updateTower - req.body:', req.body);
    const { lat, lng, photo, operators, status, notes } = req.body;
    // operators теперь строка
    const tower = await Tower.findByPk(towerId);
    if (!tower) {
      return res.status(404).json({ message: 'Вышка не найдена' });
    }
    await tower.update({ lat, lng, photo, operators, status, notes });
    console.log('updateTower - tower updated:', tower);
    res.json(tower);
  } catch (err) {
    console.error('updateTower - error:', err);
    res.status(500).json({ message: 'Ошибка при обновлении информации о вышке' });
  }
};

// Удаление вышки
exports.deleteTower = async (req, res) => {
  try {
    const towerId = req.params.id;
    const tower = await Tower.findByPk(towerId);
    if (!tower) {
      return res.status(404).json({ message: 'Вышка не найдена' });
    }
    await tower.destroy();
    res.status(204).send();
  } catch (err) {
    console.error('deleteTower - error:', err);
    res.status(500).json({ message: 'Ошибка при удалении вышки' });
  }
};

exports.getAllTowers = async (req, res) => {
  try {
    const towers = await Tower.findAll();
    console.log('getAllTowers - towers:', towers);
    res.json(towers);
  } catch (err) {
    console.error('getAllTowers - error:', err);
    res.status(500).json({ message: 'Ошибка при получении вышек' });
  }
};