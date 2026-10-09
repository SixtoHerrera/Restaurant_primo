import { labelZpl, sendZpl } from "./printer.mjs";
const order = {
  number: "PRUEBA",
  name: "Prueba de conexión USB",
  day: "2026-10-09",
  created: new Date().toISOString(),
  total: 350,
  items: [
    {
      name: "Taco asada",
      qty: 1,
      unit: 350,
      options: [
        { name: "Cebolla" },
        { name: "Cilantro" },
        { name: "Aguacate" },
      ],
    },
  ],
};
console.log(await sendZpl(labelZpl(order)));
