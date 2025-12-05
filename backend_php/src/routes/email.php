<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function handleProcessInvoice($input) {
    if (!isset($_FILES['attachment'])) {
        sendJsonResponse(['error' => 'Adjunto de factura requerido'], 400);
    }

    $from = $input['from'] ?? '';
    $subject = $input['subject'] ?? '';
    $body = $input['body'] ?? '';

    $file = $_FILES['attachment'];
    $uploadDir = __DIR__ . '/../../uploads/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $filePath = $uploadDir . uniqid() . '_' . basename($file['name']);

    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        sendJsonResponse(['error' => 'Error uploading file'], 500);
    }

    $db = Database::getInstance()->getConnection();

    // Log the email
    $stmt = $db->prepare('INSERT INTO email_logs (remitente, asunto, archivo_adjunto) VALUES (?, ?, ?)');
    $stmt->execute([$from, $subject, $filePath]);

    // For now, just log it. In production, process the PDF
    sendJsonResponse([
        'id' => $db->lastInsertId(),
        'message' => 'Email procesado exitosamente. Pendiente de revisión manual.',
        'attachment_path' => $filePath
    ]);
}

function handlePendingEmails() {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->query('SELECT * FROM email_logs WHERE procesado = FALSE ORDER BY fecha_recepcion DESC');
    sendJsonResponse($stmt->fetchAll());
}