(function () {
    'use strict';

    var modalElement = document.getElementById('employeeModal');
    var modal = new bootstrap.Modal(modalElement);

    var titleElement = document.getElementById('employeeModalTitle');
    var errorElement = document.getElementById('modalError');
    var idField = document.getElementById('fieldId');

    var fields = {
        lastName: document.getElementById('fieldLastName'),
        firstName: document.getElementById('fieldFirstName'),
        middleName: document.getElementById('fieldMiddleName'),
        birthDate: document.getElementById('fieldBirthDate'),
        hireDate: document.getElementById('fieldHireDate'),
        dismissDate: document.getElementById('fieldDismissDate'),
        isActive: document.getElementById('fieldIsActive')
    };

    var btnAdd = document.getElementById('btnAdd');
    var btnEdit = document.getElementById('btnEdit');
    var btnDelete = document.getElementById('btnDelete');
    var btnSave = document.getElementById('btnSave');

    function selectedId() {
        var radio = document.querySelector('input.row-select:checked');
        return radio ? parseInt(radio.value, 10) : null;
    }

    function refreshButtons() {
        var id = selectedId();
        btnEdit.disabled = id === null;
        btnDelete.disabled = id === null;
    }

    function dateInputValue(value) {
        return value ? String(value).slice(0, 10) : '';
    }

    function showError(message) {
        if (!message) {
            errorElement.classList.add('d-none');
            errorElement.textContent = '';
            return;
        }

        errorElement.textContent = message;
        errorElement.classList.remove('d-none');
    }

    function validationMessage(payload, fallback) {
        if (payload && payload.errors) {
            var messages = [];
            Object.keys(payload.errors).forEach(function (key) {
                messages = messages.concat(payload.errors[key]);
            });

            if (messages.length > 0) {
                return messages.join(' ');
            }
        }

        return payload && payload.title ? payload.title : fallback;
    }

    function clearForm() {
        idField.value = '';
        fields.lastName.value = '';
        fields.firstName.value = '';
        fields.middleName.value = '';
        fields.birthDate.value = '';
        fields.hireDate.value = '';
        fields.dismissDate.value = '';
        fields.isActive.checked = true;
        showError('');
    }

    function openCreate() {
        clearForm();
        titleElement.textContent = 'Добавление сотрудника';
        modal.show();
    }

    function openEdit() {
        var id = selectedId();
        if (id === null) {
            return;
        }

        showError('');
        titleElement.textContent = 'Изменение сотрудника';

        fetch('/api/employees/' + id)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Сотрудник не найден');
                }

                return response.json();
            })
            .then(function (employee) {
                idField.value = employee.id;
                fields.lastName.value = employee.lastName || '';
                fields.firstName.value = employee.firstName || '';
                fields.middleName.value = employee.middleName || '';
                fields.birthDate.value = dateInputValue(employee.birthDate);
                fields.hireDate.value = dateInputValue(employee.hireDate);
                fields.dismissDate.value = dateInputValue(employee.dismissDate);
                fields.isActive.checked = !!employee.isActive;
                modal.show();
            })
            .catch(function (error) {
                showError(error.message);
            });
    }

    function payload() {
        return {
            lastName: fields.lastName.value.trim(),
            firstName: fields.firstName.value.trim(),
            middleName: fields.middleName.value.trim() || null,
            birthDate: fields.birthDate.value || null,
            hireDate: fields.hireDate.value || null,
            dismissDate: fields.dismissDate.value || null,
            isActive: fields.isActive.checked
        };
    }

    function save() {
        var id = idField.value;
        var request = payload();

        if (!request.lastName || !request.firstName || !request.hireDate) {
            showError('Заполните фамилию, имя и дату трудоустройства');
            return;
        }

        var isUpdate = id !== '';
        var url = isUpdate ? '/api/employees/' + id : '/api/employees';

        btnSave.disabled = true;

        fetch(url, {
            method: isUpdate ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        })
            .then(function (response) {
                if (response.ok) {
                    window.location.reload();
                    return;
                }

                return response.json()
                    .then(function (payload) {
                        throw new Error(validationMessage(payload, 'Не удалось сохранить сотрудника'));
                    });
            })
            .catch(function (error) {
                showError(error.message);
            })
            .finally(function () {
                btnSave.disabled = false;
            });
    }

    function remove() {
        var id = selectedId();
        if (id === null) {
            return;
        }

        if (!window.confirm('Удалить сотрудника #' + id + '?')) {
            return;
        }

        fetch('/api/employees/' + id, { method: 'DELETE' })
            .then(function (response) {
                if (response.ok) {
                    window.location.reload();
                    return;
                }

                showError('Не удалось удалить сотрудника');
            });
    }

    document.querySelectorAll('input.row-select').forEach(function (radio) {
        radio.addEventListener('change', refreshButtons);
    });

    document.querySelectorAll('tr.employee-row').forEach(function (row) {
        row.addEventListener('click', function (event) {
            if (event.target.classList.contains('row-select')) {
                return;
            }

            var radio = row.querySelector('input.row-select');
            if (radio) {
                radio.checked = true;
                refreshButtons();
            }
        });
    });

    btnAdd.addEventListener('click', openCreate);
    btnEdit.addEventListener('click', openEdit);
    btnDelete.addEventListener('click', remove);
    btnSave.addEventListener('click', save);

    refreshButtons();
})();