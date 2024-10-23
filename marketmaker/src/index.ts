import axios from "axios";

const BaseUrl = "http://localhost:3000";
const TOTAL_BIDS = 15;
const TOTAL_ASKS = 15;
const MARKET = "TATA_INR";
const USER_ID = "5";

async function main(){
    const price = 1000 + Math.random() * 10;
    const openOrders = await axios.get(`${BaseUrl}/api/v1/order/open?userId=${USER_ID}&market=${USER_ID}`);

    const totalBids = openOrders.data.filter((order: any) => order.side === "buy").length;
    const totalAsks = openOrders.data.filter((order: any) => order.side === "sell").length;

    const cancelledBids = await cancelBidsMoreThan(openOrders.data, price);
    const cancelledAsks = await cancelAsksMoreThan(openOrders.data, price);



    let bidstoAdd = TOTAL_BIDS - totalBids -cancelledBids;
    let askstoAdd = TOTAL_ASKS - totalAsks -cancelledAsks;

    while(bidstoAdd > 0 || askstoAdd > 0){
        if(bidstoAdd > 0){
            await axios.post(`${BaseUrl}/api/v1/order`,{
                market: MARKET,
                price: (price - Math.random() * 1).toFixed(1).toString(),
                quantity: "1",
                side: "buy",
                userId: USER_ID 
            })
            bidstoAdd--;
        }else if(askstoAdd > 0){
            await axios.post(`${BaseUrl}/api/v1/order`,{
                market: MARKET,
                price: (price + Math.random() * 1).toFixed(1).toString(),
                quantity: "1",
                side: "sell",
                userId: USER_ID
            })
            askstoAdd--;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        main();
    }
}

async function cancelAsksMoreThan(openOrders: any[], price: number) {
    let promises: any[]= [];
    openOrders.map(o=>{
        if(o.side === "sell" && (o.price < price || Math.random()<0.1)){
            promises.push(axios.delete(`${BaseUrl}/api/v1/order`,{
                data:{
                    orderId : o.orderId,
                    market: MARKET
                }
            }))
        }
    })
    Promise.all(promises);
    return promises.length;
};

async function cancelBidsMoreThan(openOrders: any[], price: number) {
    let promises: any[]= [];
    openOrders.map(o =>{
        if(o.side === "buy" && (o.price > price || Math.random() < 0.1)){
            promises.push(axios.delete(`${BaseUrl}/api/v1/order`,{
                data:{
                    orderId: o.orderId,
                    market:MARKET,

                }
            }))
    }})
    await Promise.all(promises);
    return promises.length;
}

main();