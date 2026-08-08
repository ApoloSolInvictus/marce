<?php
	require_once("mailchimp/MCAPI.class.php");
	$api_key = 'PUT YOUR API KEY HERE...';
	$list_id = 'PUT A VALID LIST ID...';
	$email = filter_var($_REQUEST['mc_email'] ?? '', FILTER_VALIDATE_EMAIL);

	if(!$email) {
		echo '<span class="error-msg"><b>Error:</b>&nbsp;Please enter a valid email address.</span>';
		exit;
	}

	if($api_key === 'PUT YOUR API KEY HERE...' || $list_id === 'PUT A VALID LIST ID...') {
		echo '<span class="error-msg"><b>Error:</b>&nbsp;Newsletter signup is not configured for this demo.</span>';
		exit;
	}

	$mcapi = new MCAPI($api_key);
	$lists = $mcapi->lists();

	if($lists) {
		$merge_vars = Array('EMAIL' => $email);

		if($mcapi->listSubscribe($list_id, $email, $merge_vars ) ):
			echo '<span class="success-msg">Success!&nbsp; Check your inbox or spam folder for a message containing a confirmation link.</span>';
		else:
			echo '<span class="error-msg"><b>Error:</b>&nbsp;'.htmlspecialchars($mcapi->errorMessage, ENT_QUOTES, 'UTF-8').'</span>';
		endif;
	}
	else {
		echo '<span class="error-msg"><b>Error:</b>&nbsp;Mailchimp API is not Valid.</span>';
	}
?>
