ymaps.ready(init);
let map;
let markers = [];
let towers = [];
let currentCoords;
let currentTowerId = null;
let startTowerId = null;
let endTowerId = null;

function init() {
    map = new ymaps.Map('map', {
        center: [56.3272, 44.0054],
        zoom: 12,
        controls: ['zoomControl']
    });

    map.events.add('click', function (e) {
        if (isLoggedIn()){
          addTower(e.get('coords'));
        }
    });

    loadTowers();

    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');

    if (lat && lng) {
        map.setCenter([parseFloat(lat), parseFloat(lng)], 16);
    }
}

function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'register.html';
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

function showTowerForm(coords) {
    $('#towerModal').modal('show');
    currentCoords = coords;
}

function clearMarkerSelection() {
    markers.forEach(marker => {
        marker.options.set('preset', 'islands#blueTowerIcon');
    });
}

async function calculateRoute() {
    if (!startTowerId || !endTowerId) {
      alert("Выберите начальную и конечную вышки!");
      return;
    }
  
    try {
      // Делаем запрос к нашему серверу для расчета маршрута
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
  
      // data.routeIds - массив ID вышек в маршруте
      console.log("Маршрут:", data.routeIds);
  
      // Отображаем маршрут на карте
      displayRouteOnMap(data.routeIds.map(id => {
        const tower = towers.find(t => t.id == id);
        return [tower.lat, tower.lng];
      }));
  
      // Выводим сообщение об успехе
      document.getElementById('route-info').innerText = `Маршрут успешно построен!`;
  
    } catch (error) {
      console.error('Ошибка:', error);
      document.getElementById('route-info').innerText = 'Ошибка при обработке запроса';
    }
  }

function displayRouteOnMap(routeCoordinates) {
    // Удаляем старый маршрут, если он был
    if (map.route) {
        map.geoObjects.remove(map.route);
        map.route = null;
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

async function saveTowerData() {
    const towerPhoto = document.getElementById('towerPhoto').value;
    const towerOperators = document.getElementById('towerOperators').value;
    const towerStatus = document.getElementById('towerStatus').value;
    const towerNotes = document.getElementById('towerNotes').value;
    const addedAt = Date.now();

    const newTower = {
        id: currentTowerId || Date.now(),
        coords: {
            lat: currentCoords[0],
            lng: currentCoords[1]
        },
        photo: towerPhoto,
        operators: towerOperators, // Теперь просто строка
        status: towerStatus,
        notes: towerNotes,
        addedAt: addedAt
    };

    console.log('saveTowerData - newTower:', newTower);

    try {
        let response;
        if (!currentTowerId) {
            response = await fetch('/api/towers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lat: newTower.coords.lat,
                    lng: newTower.coords.lng,
                    photo: newTower.photo,
                    operators: newTower.operators,
                    status: newTower.status,
                    notes: newTower.notes
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка при добавлении вышки');
            }

            const addedTower = await response.json();
            newTower.id = addedTower.id;
            towers.push(newTower);
            addTowerToMap(newTower);
        } else {
            response = await fetch(`/api/towers/${currentTowerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lat: newTower.coords.lat,
                    lng: newTower.coords.lng,
                    photo: newTower.photo,
                    operators: newTower.operators,
                    status: newTower.status,
                    notes: newTower.notes
                })
            });

            if (!response.ok) {
                throw new Error('Ошибка при обновлении вышки');
            }

            const updatedTower = await response.json();
            const towerIndex = towers.findIndex(t => t.id == currentTowerId);
            if (towerIndex > -1) {
                towers[towerIndex] = {
                    ...towers[towerIndex],
                    coords: {
                        lat: updatedTower.lat,
                        lng: updatedTower.lng
                    },
                    photo: updatedTower.photo,
                    operators: updatedTower.operators,
                    status: updatedTower.status,
                    notes: updatedTower.notes
                };
                const existingMarker = markers.find(marker => marker.id === currentTowerId);
                if (existingMarker) {
                    existingMarker.geometry.setCoordinates([updatedTower.lat, updatedTower.lng]);
                    existingMarker.properties.set({
                        balloonContent: updatedTower.notes + (updatedTower.operators ? `<br>Операторы: ${updatedTower.operators}` : '')
                    });
                }
            }
        }

        currentTowerId = null;
        $('#towerModal').modal('hide');
        updateTowerList();
    } catch (error) {
        console.error('Ошибка при сохранении данных вышки:', error);
        alert('Ошибка при сохранении данных вышки!');
    }
}

function addTowerToMap(tower) {
    if (!tower.lat || !tower.lng) {
        console.error("Ошибка: Некорректные координаты вышки", tower);
        return;
    }
    const marker = new ymaps.Placemark([tower.lat, tower.lng], {
        id: tower.id,
        iconCaption: 'Вышка',
        balloonContent: tower.notes + (tower.operators ? `<br>Операторы: ${tower.operators}` : '')
    }, {
        draggable: true,
        preset: 'islands#blueTowerIcon'
    });

    marker.events.add('dragend', function (e) {
        const updatedCoords = e.get('target').geometry.getCoordinates();
        updateTowerCoords(marker, updatedCoords);
    });

    marker.events.add('click', function (e) {
        if (startTowerId === tower.id) {
            // Снимаем выделение с первой вышки
            startTowerId = null;
            marker.options.set('preset', 'islands#blueTowerIcon');
            if (endTowerId !== null) {
                // Если была выбрана вторая вышка, делаем её первой
                startTowerId = endTowerId;
                endTowerId = null;
                const startMarker = markers.find(m => m.id === startTowerId);
                startMarker.options.set('preset', 'islands#redIcon');
            }
        } else if (endTowerId === tower.id) {
            // Снимаем выделение со второй вышки
            endTowerId = null;
            marker.options.set('preset', 'islands#blueTowerIcon');
        } else if (startTowerId === null) {
            // Выбираем первую вышку
            startTowerId = tower.id;
            marker.options.set('preset', 'islands#redIcon');
        } else if (endTowerId === null) {
            // Выбираем вторую вышку
            endTowerId = tower.id;
            marker.options.set('preset', 'islands#orangeIcon');
        }
    });

    map.geoObjects.add(marker);
    marker.id = tower.id;
    markers.push(marker);
}

function searchLocation(query) {
    ymaps.geocode(query).then(function (res) {
        const obj = res.geoObjects.get(0);

        if (obj) {
            const center = obj.geometry.getCoordinates();
            map.panTo(center, { duration: 500 });
            map.setZoom(16);
        } else {
            alert("Место не найдено");
        }
    });
}

function addTower(coords) {
    currentTowerId = null;
    document.getElementById('towerPhoto').value = '';
    document.getElementById('towerOperators').value = '';
    document.getElementById('towerStatus').value = 'active';
    document.getElementById('towerNotes').value = '';
    showTowerForm(coords);
}

function updateTowerCoords(marker, coords) {
    const markerIndex = markers.findIndex(m => m.id === marker.id);
    if (markerIndex > -1) {
        const towerId = markers[markerIndex].id;
        fetch(`/api/towers/${towerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lat: coords[0],
                lng: coords[1]
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Ошибка при обновлении координат вышки');
                }
                return response.json();
            })
            .then(updatedTower => {
                const towerIndex = towers.findIndex(t => t.id == towerId);
                if (towerIndex > -1) {
                    towers[towerIndex].lat = updatedTower.lat;
                    towers[towerIndex].lng = updatedTower.lng;
                    updateTowerList();
                }
            })
            .catch(error => {
                console.error('Ошибка при обновлении координат вышки:', error);
                alert('Ошибка при обновлении координат вышки!');
            });
    }
}

function updateTowerList() {
    const towersList = document.getElementById('towers');
    towersList.innerHTML = '';
    towers.forEach((tower, index) => {
        const lat = typeof tower.lat === 'number' ? tower.lat.toFixed(5) : 'N/A';
        const lng = typeof tower.lng === 'number' ? tower.lng.toFixed(5) : 'N/A';
        const listItem = document.createElement('li');
        listItem.innerHTML = `Вышка: id = ${tower.id} - Широта: ${lat}, Долгота: ${lng}
            <button class="btn btn-danger btn-sm" onclick="removeTower(${tower.id})">Удалить</button>
        `;
        towersList.appendChild(listItem);
    });
}

function removeTower(towerId) {
    fetch(`/api/towers/${towerId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка при удалении вышки');
            }
            const towerIndex = towers.findIndex(t => t.id === towerId);
            if (towerIndex > -1) {
                towers.splice(towerIndex, 1);
                const markerToRemove = markers.find(marker => marker.id === towerId);
                if (markerToRemove) {
                    map.geoObjects.remove(markerToRemove);
                    markers = markers.filter(marker => marker.id !== towerId);
                }
                updateTowerList();
            }
        })
        .catch(error => {
            console.error(error);
        });
}

function showTowerInfo(tower) {
    const towerInfoDiv = document.getElementById('tower-info');
    if (!towerInfoDiv) return;

    towerInfoDiv.innerHTML = `
        <h2>Информация о вышке</h2>
        <p><strong>ID:</strong> ${tower.id}</p>
        <p><strong>Широта:</strong> ${tower.lat.toFixed(5)}</p>
        <p><strong>Долгота:</strong> ${tower.lng.toFixed(5)}</p>
        <p><strong>Фото:</strong> <a href="${tower.photo}" target="_blank">Посмотреть фото</a></p>
        <p><strong>Операторы:</strong> ${tower.operators}</p>
        <p><strong>Статус:</strong> ${tower.status}</p>
        <p><strong>Заметки:</strong> ${tower.notes}</p>
        <button class="btn btn-primary btn-sm" onclick="editTower('${tower.id}')">Редактировать</button>
    `;
}

function editTower(towerId) {
    const tower = towers.find(t => t.id == towerId);
    if (tower) {
        currentTowerId = towerId;
        document.getElementById('towerPhoto').value = tower.photo;
        document.getElementById('towerOperators').value = tower.operators;
        document.getElementById('towerStatus').value = tower.status;
        document.getElementById('towerNotes').value = tower.notes;
        currentCoords = [tower.lat, tower.lng];
        $('#towerModal').modal('show');
    }
}