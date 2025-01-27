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
        calculateRouteButton.addEventListener('click', function(){
            clearMarkerSelection();
            calculateRoute();
        });
    }
}

async function calculateRoute() {
    if (!startTowerId || !endTowerId) {
        alert("Выберите начальную и конечную вышки!");
        return;
    }

    try {
        const response = await fetch('/api/calculate-route', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                startTowerId: startTowerId,
                endTowerId: endTowerId
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка при запросе к серверу');
        }

        const data = await response.json();

        console.log("Маршрут:", data.routeIds);

        displayRouteOnMap(data.routeIds.map(id => {
            const tower = towers.find(t => t.id == id);
            return [tower.lat, tower.lng];
        }));

        document.getElementById('route-info').innerText = `Маршрут успешно построен!`;

        // Показываем кнопку "Получить рекомендации" и контейнер для подсказок
        document.getElementById('gemini-container').style.display = 'block';

        // Сохраняем данные о маршруте
        window.routeData = data.routeData;

    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('route-info').innerText = 'Ошибка при обработке запроса';
    }
}

function displayRouteOnMap(routeCoordinates) {
  // Удаляем старый маршрут, если он был
  if (map.route) {
    map.geoObjects.remove(map.route);
    map.route = null; // Сбрасываем ссылку на объект маршрута
  }

  // Создаём ломаную линию
  map.route = new ymaps.Polyline(routeCoordinates, {
    balloonContent: "Маршрут прокладки оптоволокна"
  }, {
    strokeColor: "#0000FF",
    strokeWidth: 5,
    strokeOpacity: 0.8
  });

  // Добавляем линию на карту
  map.geoObjects.add(map.route);

  // Масштабируем карту, чтобы отобразить весь маршрут
  map.setBounds(map.route.geometry.getBounds());
}

// Вызываем функцию setupIndexPageInteractions после полной загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    setupIndexPageInteractions();

    // Добавляем обработчик клика на кнопку dropdown
    $('#dropdownMenuButton').on('click', function (event) {
        event.stopPropagation(); // Останавливаем всплытие события, чтобы не закрывать меню сразу же
        $('#gemini-dropdown').dropdown('toggle');
        showGeminiPrompts();
    });

    // Добавляем обработчик клика на весь документ, чтобы скрывать меню при клике вне его
    $(document).on('click', function(event) {
        if (!$(event.target).closest('#gemini-container').length) {
            // Скрываем меню, если клик был не по #gemini-container или его дочерним элементам
            $('#gemini-dropdown').dropdown('hide');
        }
    });
    // Скрываем ответ при закрытии
    $('#gemini-dropdown').on('hidden.bs.dropdown', function () {
        document.getElementById("gemini-response").style.display = 'none';
    });
});

function showGeminiPrompts() {
    const prompts = [
        "Почему маршрут проходит именно через эти вышки?",
        "Какие факторы повлияли на выбор этого маршрута?",
        "Есть ли альтернативные маршруты и чем они хуже/лучше?"
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

    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                routeData: window.routeData,
                userPrompt: userPrompt
            })
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