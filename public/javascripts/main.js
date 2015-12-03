(function(){
	function initFormBindings(form) {
		if(!form) {
			return;
		}
		if(!form.dataset.formData) {
			return;
		}
	}
	
	document.addEventListener('DOMContentLoaded', function() {
		var form = document.querySelector('#main form');
		initFormBindings(form);
	}, false);
}());