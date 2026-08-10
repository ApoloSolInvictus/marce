jQuery.noConflict();
jQuery(document).ready(function($){
	"use strict";

	var $form = $('#customer-login-form');
	var $status = $('#account-status');

	if(!$form.length) return;

	function setStatus(message) {
		$status.text(message);
	}

	$form.on('submit', function(event){
		event.preventDefault();
		setStatus('Firebase credentials are required before live customer login can be enabled.');
	});

	$('[data-auth-action="register"]').on('click', function(){
		setStatus('Customer registration will create a Firebase Auth user and a Firestore profile after the Firebase project is connected.');
	});
});
