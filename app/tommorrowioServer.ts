"use server";


const TOMORROW_API_KEY = process.env.TOMORROW_API_KEY!;

export async function getTommorrowIoWeather(lat: number, lon: number): Promise<any> {
  try {
    const res = await fetch(
      `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&units=metric&apikey=${TOMORROW_API_KEY}`,
      { next: { revalidate: 60 * 30 } } // 30-min cache
    );

    if (!res.ok) throw new Error("Tomorrow.io API error");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Tomorrow.io fetch failed:", err);
    throw err;
  }
}
