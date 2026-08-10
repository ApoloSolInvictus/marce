jQuery.noConflict();
jQuery(document).ready(function($){
	"use strict";

	var $form = $('#customer-login-form');
	var $status = $('#account-status');

	if(!$form.length) return;

	function setStatus(message) {
		$status.text(message);
	}

	function capturePayPalReturn() {
		var params = new URLSearchParams(window.location.search);
		var orderId = params.get('order');
		var paypalOrderId = params.get('token');
		var payment = params.get('payment');

		if(payment !== 'paypal-success' || !orderId || !paypalOrderId) return;

		setStatus('Confirming PayPal payment...');
		fetch('/api/capture-paypal-order', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				orderId: orderId,
				paypalOrderId: paypalOrderId
			})
		})
			.then(function(response){
				return response.json().then(function(body){
					if(!response.ok) throw new Error(body.error || 'PayPal payment could not be confirmed.');
					return body;
				});
			})
			.then(function(){
				setStatus('PayPal payment confirmed. Your order progress has been updated.');
				try {
					localStorage.removeItem('eternaEspressioneCart');
				} catch(error) {}
			})
			.catch(function(error){
				setStatus(error.message);
			});
	}

	$form.on('submit', function(event){
		event.preventDefault();
		setStatus('Firebase credentials are required before live customer login can be enabled.');
	});

	$('[data-auth-action="register"]').on('click', function(){
		setStatus('Customer registration will create a Firebase Auth user and a Firestore profile after the Firebase project is connected.');
	});

	capturePayPalReturn();
});
