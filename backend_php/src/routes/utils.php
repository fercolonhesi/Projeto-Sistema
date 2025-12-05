<?php

function handleBarcode($code) {
    // For now, just return the code as text
    // In production, implement real barcode generation
    sendJsonResponse(['code' => $code, 'message' => 'Barcode generation not implemented yet']);
}