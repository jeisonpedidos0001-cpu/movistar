import React from 'react';
import { Routes, Route } from 'react-router-dom';
// importacion de las vistas 
import MovistarPaymentPortal from './MovistarPaymentPortal';
import CheckoutCobre from './CheckoutCobre';

//configuracion de las rutas de la aplicacion

export default function GeneralRoutes() {
    return (
        <Routes>
            <Route path="/" element={<MovistarPaymentPortal />} />
            <Route path="/checkout" element={<CheckoutCobre />} />
        </Routes>
    );
}
// exportacion de las rutas     