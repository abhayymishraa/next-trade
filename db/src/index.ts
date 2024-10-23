import { Client } from "pg";
import { createClient } from "redis";
import { DbMessage } from "./types";


const pgClient = new Client({
    user: 'your_user',
    host: 'localhost',
    database:'my_database',
    port: 5432,
    password: 'your_password'
});

pgClient.connect();

async function main(){

    const redisClient =  createClient();
    await redisClient.connect();
    console.log('redis is connected');

    while(true){
        const response = await redisClient.brPop('db_processor' as string,0);
        if(!response){

        }else{
            const data:DbMessage = JSON.parse(response.element);
            if(data.type == "TRADE_ADDED"){
                console.log(" adding data : "+ data);
                console.log(data.data)
                console.log(data.type);
                const price = data.data.price;
                const timestamp = new Date(data.data.timestamp);
                const query = 'INSERT INTO tata_prices (time, price) VALUES ($1, $2)';
                const values  = [timestamp,price];
                await pgClient.query(query,values);

            } 
        }
        
    }


}

main();