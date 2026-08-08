<?php
if(!$_POST) exit;

    $to 	  = 'someemail@somedomain.com'; #Replace your email id...
	$name	  = trim(strip_tags($_POST['txtname'] ?? ''));
	$email    = trim($_POST['txtemail'] ?? '');
	$subject  = 'Support';
    $comment  = trim(strip_tags($_POST['txtmessage'] ?? ''));

    $name = str_replace(array("\r", "\n"), '', $name);
    $email = str_replace(array("\r", "\n"), '', $email);

    if(!filter_var($email, FILTER_VALIDATE_EMAIL) || $name === '' || $comment === '') {
        echo '<div class="dt-sc-error-box aligncenter"> <span></span> <h4> Error </h4> Please enter a valid name, email, and message. </div>';
        exit;
    }

	if(function_exists('get_magic_quotes_gpc') && get_magic_quotes_gpc()) { $comment = stripslashes($comment); }

	 $e_subject = 'You\'ve been contacted by ' . $name . '.';

	 $msg  = "You have been contacted by $name with regards to $subject.\r\n\n";
	 $msg .= "$comment\r\n\n";
	 $msg .= "You can contact $name via email, $email.\r\n\n";
	 $msg .= "-------------------------------------------------------------------------------------------\r\n";

	 $headers = "From: Website Contact <{$to}>\r\nReply-To: {$email}\r\nReturn-Path: {$to}\r\n";

	 if(@mail($to, $e_subject, $msg, $headers))
	 {
		 echo '<div class="dt-sc-success-box aligncenter"> <span></span> <h4> Success </h4> Thanks for <b>Contacting Us</b>, We will call back to you soon.</div>';

	 }
	 else
	 {
		 echo '<div class="dt-sc-error-box aligncenter"> <span></span> <h4> Error </h4> Sorry your message <b>not sent</b>, Try again Later. </div>';
	 }
?>
