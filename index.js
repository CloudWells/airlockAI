function setupIndexPageInteractions() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const calculateRouteButton = document.getElementById('calculate-route');
  
    if (searchInput && searchButton) {
      searchButton.addEventListener('click', function () {
        const query = searchInput.value;
        searchLocation(query);
      });
    }
  
    if (calculateRouteButton) {
      calculateRouteButton.addEventListener('click', function () {
        clearMarkerSelection();
        calculateRoute();
      });
    }
  }
  
  async function calculateRoute() {
    if (!startTowerId || !endTowerId) {
      alert('Выберите начальную и конечную вышки!');
      return;
    }
  
    try {
      const response = await fetch('/api/calculate-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTowerId: startTowerId,
          endTowerId: endTowerId,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Ошибка при запросе к серверу');
      }
  
      const data = await response.json();
  
      console.log('Маршрут:', data.routeIds);
  
      displayRouteOnMap(
        data.routeIds.map(id => {
          const tower = towers.find(t => t.id == id);
          return [tower.lat, tower.lng];
        }),
      );
  
      document.getElementById('route-info').innerText = `Маршрут успешно построен!`;
  
      // Показываем кнопку "Получить рекомендации" и контейнер для подсказок
      const geminiContainer = document.getElementById('gemini-container');
      geminiContainer.style.display = 'block';
      setTimeout(() => {
        geminiContainer.classList.add('show');
      }, 10);
  
      // Сохраняем данные о маршруте
      window.routeData = data.routeData;
    } catch (error) {
      console.error('Ошибка:', error);
      document.getElementById('route-info').innerText =
        'Ошибка при обработке запроса';
    }
  }
  
  function displayRouteOnMap(routeCoordinates) {
    // Удаляем старый маршрут, если он был
    if (map.route) {
      map.geoObjects.remove(map.route);
      map.route = null; // Сбрасываем ссылку на объект маршрута
    }
  
    // Создаём ломаную линию
    map.route = new ymaps.Polyline(
      routeCoordinates,
      {
        balloonContent: 'Маршрут прокладки оптоволокна',
      },
      {
        strokeColor: '#0000FF',
        strokeWidth: 5,
        strokeOpacity: 0.8,
      },
    );
  
    // Добавляем линию на карту
    map.geoObjects.add(map.route);
  
    // Масштабируем карту, чтобы отобразить весь маршрут
    map.setBounds(map.route.geometry.getBounds());
  }
  
  // Вызываем функцию setupIndexPageInteractions после полной загрузки DOM
  document.addEventListener('DOMContentLoaded', function () {
    setupIndexPageInteractions();
    $('#dropdownMenuButton').on('click', function (event) {
      event.stopPropagation();
      $('#gemini-dropdown').dropdown('toggle');
      showGeminiPrompts();
    });
  
    $('#gemini-dropdown').on('hidden.bs.dropdown', function () {
      document.getElementById('gemini-response').style.display = 'none';
    });
  
    // Добавляем обработчик клика на весь документ
    $(document).on('click', function (event) {
      // Проверяем, был ли клик вне элемента #gemini-container
      if (!$(event.target).closest('#gemini-container').length) {
        // Если клик был вне #gemini-container, скрываем дропдаун
        $('#gemini-dropdown').dropdown('hide');
      }
    });
  });
  
  function showGeminiPrompts() {
    const prompts = [
      'Почему маршрут проходит именно через эти вышки?',
      'Какие факторы повлияли на выбор этого маршрута?',
      'Есть ли альтернативные маршруты и чем они хуже/лучше?',
    ];
  
    const promptsContainer = document.getElementById('gemini-prompts');
    promptsContainer.innerHTML = '';
  
    prompts.forEach(prompt => {
      const button = document.createElement('button');
      button.classList.add('dropdown-item');
      button.textContent = prompt;
      button.addEventListener('click', () => getGeminiResponse(prompt));
      promptsContainer.appendChild(button);
    });
  }
  
  async function getGeminiResponse(userPrompt) {
    const responseContainer = document.getElementById('gemini-response');
    responseContainer.innerText = 'Генерирую ответ...';
    responseContainer.style.display = 'block';
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routeData: window.routeData,
          userPrompt: userPrompt,
        }),
      });
  
      if (!response.ok) {
        throw new Error('Ошибка при запросе к Gemini');
      }
  
      const data = await response.json();
      responseContainer.innerText = data.description;
    } catch (error) {
      console.error('Ошибка:', error);
      responseContainer.innerText = 'Ошибка при получении ответа от Gemini.';
    }
  }
  
  async function loadTowers() {
    try {
      const response = await fetch('/api/towers');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке вышек');
      }
      const towersData = await response.json();
  
      map.geoObjects.removeAll();
      markers = [];
  
      towersData.forEach(towerData => {
        addTowerToMap(towerData);
      });
  
      towers = towersData;
      updateTowerList();
    } catch (error) {
      console.error('Ошибка при загрузке вышек:', error);
      alert('Ошибка при загрузке вышек!');
    }
  }
  
  function updateTowerList() {
    const towersList = document.getElementById('towers-list');
    towersList.innerHTML = '';
  
    // Убираем ограничение slice(0, 5)
    towers.forEach((tower, index) => {
      const lat = typeof tower.lat === 'number' ? tower.lat.toFixed(5) : 'N/A';
      const lng = typeof tower.lng === 'number' ? tower.lng.toFixed(5) : 'N/A';
      const listItem = document.createElement('li');
      listItem.classList.add('list-group-item', 'tower-list-item');
      listItem.innerHTML = `
        <h5 class="mb-1">Вышка ID: ${tower.id}</h5>
        <p class="mb-1">Широта: ${lat}, Долгота: ${lng}</p>
        <p class="mb-1">Фото: <a href="${
          tower.photo ? tower.photo : '#'
        }" target="_blank">${tower.photo || 'Нет фото'}</a></p>
        <p class="mb-1">Операторы: ${tower.operators || 'Не указано'}</p>
        <p class="mb-1">Статус: ${getStatusDescription(tower.status)}</p>
        <p class="mb-1">Заметки: ${tower.notes || 'Нет заметок'}</p>
        <button class="btn btn-primary btn-sm mt-2" onclick="openMap(${
          tower.lat
        }, ${tower.lng})">Открыть на карте</button>
        <button class="btn btn-danger btn-sm" onclick="removeTower(${
          tower.id
        })">Удалить</button>
      `;
      towersList.appendChild(listItem);
    });
  }
  
    function getStatusDescription(status) {
      switch (status) {
          case 'overload': return 'Перегружена';
          case 'accident': return 'Авария';
          case 'free': return 'Свободна';
          case 'active': return 'Активна';
          default: return 'Неизвестно';
      }
  }
  
    // Функция для открытия карты с маркером вышки (перенесена из towers.js)
  window.openMap = (lat, lng) => {
      window.location.href = `index.html?lat=${lat}&lng=${lng}`;
  };