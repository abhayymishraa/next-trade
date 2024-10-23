import { createClient } from "redis";
import { Engine } from "./trade/engine";


async function main(){
   const engine = new Engine();
   const redisClient = createClient();
   await redisClient.connect();
   console.log("Redis connected");
   while(true){
    const response = await redisClient.brPop("message" as string,0);
    if(!response){
        continue;
    }else{
        console.log("Received message: ", response);
        engine.process(JSON.parse(response.element));
    }
   }
}

main();