var frontend = (function() {

	"use strict";

	var listEl, template, notifyTimer,
		preventDoubleClicks = false;

	//Show notification
	function notify(str, type)
	{
		if(!str)
		{
			return false;
		}

		clearTimeout(notifyTimer);
		type = type || 'notice';

		var el = document.getElementById('notification');
		el.className = type;
		el.innerHTML = str;
		el.style.display = 'block';

		notifyTimer = setTimeout(function(){
			el.style.display = 'none';
		}, 5000);

		return true;
	}

	//Toggle visibility of element
	function toggleVisibility(el)
	{
		var obj = (typeof el === 'object') ? el : document.getElementById(el);
		obj.style.display = (obj.style.display !== 'none' ? 'none' : '' );
	}

	//Fill form fields with data object's contents
	function fillForm(formname, data)
	{
		var form = document.forms[formname],
			field;

		for(var prop in data)
		{
			field = form.querySelector('[name=' + prop + ']');
			if(field)
			{
				field.value = data[prop];
			}
		}
	}

	/**
	* Validate form data
	* @param data = object containing form field data as key:value pairs
	**/
	function validateFormData(data)
	{
		var errors = [],
			minLength = 2;

		for(var prop in data)
		{
			if(prop === 'id') { continue; }
			if(data[prop].length < minLength)
			{
				errors.push(prop);
			}
		}

		if(errors.length)
		{
			var errorStr = '<p>Error! The following fields are empty or too short:</p><ul>';
			for(var i = 0; i < errors.length; i++)
			{
				errorStr += '<li>' + errors[i] + '</li>';
			}
			errorStr += '</ul>';

			notify(errorStr, 'error');

			return false;
		}

		return true;
	}

	function clearForm(formname)
	{
		var form = document.forms[formname],
			inputs = form.getElementsByTagName('input');

		for(var i = 0; i < inputs.length; i++)
		{
			inputs[i].value = '';
		}
	}

	/**
	 * Get stuff via AJAX, expects JSON as response
	 * @param options. Required property url, optional properties method and data 
	 * @param callback The callback to perform when request gets valid response
	 */
	function ajax(options, callback)
	{
		var xhr;
		if(!options)
		{
			throw new Error('AJAX error, options object not defined');
		}

		if(window.XMLHttpRequest)
		{
			xhr = new XMLHttpRequest();

			xhr.onreadystatechange = function() {
				//Response complete
				if(xhr.readyState === 4)
				{
					if(typeof callback === 'function')
					{
						if(xhr.status === 200)
						{
							callback( JSON.parse(xhr.responseText) );	//Call callback function and give it the parsed JSON object
						}
						else
						{
							notify('AJAX error: ' + xhr.status, 'error');
						}
					}
				}
			};

			//Start async request
			options.method = options.method || 'POST';

			xhr.open(options.method, options.url, true);

			//Hustle data to proper format if object
			if(options.data)
			{
				if(typeof options.data === 'object')
				{
					options.data = JSON.stringify(options.data);
				}
				
				xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');
			}

			xhr.send(options.data);
		}
	}

	function fillTemplate(templateStr, data)
	{
		if(data)
		{
			for(var prop in data)
			{
				var pattern = new RegExp('{{' + prop + '}}','g');
				templateStr = templateStr.replace(pattern, data[prop]);
			}
		}

		return templateStr;
	}

	//Load client list via AJAX and render it
	function updateClientList()
	{
		var table = document.getElementById('list'),
			spinner = document.getElementById('spinner');
		toggleVisibility(table);
		toggleVisibility(spinner);

		ajax({ url: '/getClientList' }, function(data) {
			toggleVisibility(spinner);
			toggleVisibility(table);

			if(data)
			{
				if(data.length)
				{
					//Clients found
					var str = '';

					for(var i = 0; i < data.length; i++)
					{
						str += fillTemplate(template, data[i]);
					}
					
					listEl.innerHTML = str;
				}
				else
				{
					//No clients
					listEl.innerHTML = '<tr><td><p class="notice">No clients. Get some!</p></td><td></td><td></td></tr>';
				}
			}
			else
			{
				//Data could not be loaded
				listEl.innerHTML = '<tr><td><p class="error">Client data could not be loaded</p></td><td></td><td></td></tr>';
			}

		});

	}

	//Get a single client's data
	function getClient(id)
	{
		if(id)
		{
			ajax({ method: 'POST', url: '/getClient', data: { id: id } }, function(data) {
				if(data && data._id)
				{
					data.id = data._id;

					fillForm('edit-client-form', data);
					document.getElementById('edit-client-dialog').style.display = 'block';
				}
				else
				{
					notify('Client data not found', 'error');
				}
			});
		}
		else
		{
			notify('No id', 'error');
		}
	}

	//Object literal for easier reading
	var btnEvents = {
		addClient: function(e) {
			e.preventDefault();
			clearForm('edit-client-form');
			document.getElementById('edit-client-dialog').style.display = 'block';
		},

		editClient: function(e)
		{
			e.preventDefault();
			var el = e.target.parentElement.parentElement,
				id = el.getAttribute('data-id');
			
			getClient(id);
		},

		removeClient: function(e) {
			e.preventDefault();
			//Delete client button clicked
			var button = e.target,
				el = button.parentElement.parentElement;
				

			//To confirm delete, button must be clicked a second time
			if(/btn-danger/.test(button.className))
			{
				//Already clicked once, allow delete
				
				var	obj = {
						id: el.getAttribute('data-id')
					};

				ajax({ url: '/editClient', method: 'DELETE', data: obj }, function(response) {
					if(response.status)
					{
						el.parentElement.removeChild(el);
						notify('Client removed', 'success');

						if(!listEl.children.length)
						{
							updateClientList();
						}
					}
					else
					{
						notify('Could not remove client', 'error');
						button.className = button.className.replace('btn-danger','');
					}
					
				});
				
			}
			else
			{
				//First click, turn button red
				var buttons = listEl.querySelectorAll('.delete-client-button');
				for(var i = 0; i < buttons.length; i++)
				{
					buttons[i].className = buttons[i].className.replace('btn-danger', '');
				}

				button.className += ' btn-danger';
			}
		},

		closeEditDialog: function(e) {
			e.preventDefault();
			document.getElementById('edit-client-dialog').style.display = 'none';
		}
	};

	function submitForm(e)
	{
		e.preventDefault();
		
		if(!preventDoubleClicks)
		{
			preventDoubleClicks = true;

			var inputs = document.forms['edit-client-form'].getElementsByTagName('input'),
				obj = {};

			//Read input fields and create object key:value pairs	
			for(var i = 0; i < inputs.length; i++)
			{
				var item = inputs[i];

				obj[ item.getAttribute('name') ] = item.value;
			}

			if(!validateFormData(obj))
			{
				preventDoubleClicks = false;
				return false;
			}

			//Send form
			ajax({ url: '/editClient', method: 'PUT', data: obj }, function(data) {
				if(data)
				{
					if(data.status)
					{
						toggleVisibility('edit-client-dialog');
						clearForm('edit-client-form');
						

						updateClientList();

						notify('Client data saved', 'success');
					}
					else
					{
						notify('Saving client data failed', 'error');
					}
					
				}
				else
				{
					notify('Fatal error when saving client data', 'error');
				}

				preventDoubleClicks = false;
			});
		}
		
		return false;
	}

	document.onreadystatechange = function() {
		if(document.readyState === 'complete') {

			//Get template from HTML
			template = document.getElementById('list-item-template').innerHTML;

			document.getElementById('add-client-button').addEventListener('click', btnEvents.addClient, false);
			document.getElementById('close-edit-dialog').addEventListener('click',btnEvents.closeEditDialog, false);

			listEl = document.getElementById('list-body');

			//Bind events to list so they can be handled when propagating up from DOM tree
			listEl.addEventListener('click', function(e) {

				if(/edit-client-button/.test(e.target.className))
				{
					btnEvents.editClient(e);
				}
				else if(/delete-client-button/.test(e.target.className))
				{
					btnEvents.removeClient(e);
				}
			}, false);

			document.forms['edit-client-form'].addEventListener('submit', submitForm, false);
			
			//Update client list on page load
			updateClientList();
		}
	};

	return {
		notify: notify,
		toggleVisibility: toggleVisibility,
		ajax: ajax,
		fillTemplate: fillTemplate,
		fillForm: fillForm,
		validateFormData: validateFormData,
		updateClientList: updateClientList,
		getClient: getClient
	};

}());