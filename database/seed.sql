INSERT INTO catalogo_servicios (concepto, precio_base, categoria, participa_descuento, stock_maximo)
VALUES
    ('Renta de silla', 15.00, 'Mobiliario', TRUE, 300),
    ('Renta de mesa', 120.00, 'Mobiliario', TRUE, 30),
    ('Paquete de decoración', 800.00, 'Decoración', TRUE, 5),
    ('Servicio de entrega', 250.00, 'Logística', FALSE, NULL)
ON CONFLICT (concepto) DO UPDATE SET
    precio_base = EXCLUDED.precio_base,
    categoria = EXCLUDED.categoria,
    participa_descuento = EXCLUDED.participa_descuento,
    stock_maximo = EXCLUDED.stock_maximo;
