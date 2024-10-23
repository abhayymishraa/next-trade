import { createClient, RedisClientType } from "redis";
import { MessageFromOrderbook, MessageToEngine } from "./types/types";

export class RedisManager{
    private client:RedisClientType;
    private publisher:RedisClientType;
    private static instance:RedisManager;

    private constructor(){
        this.client = createClient();
        this.client.connect();
        this.publisher = createClient();
        this.publisher.connect();
    }
    
    public static getInstance(){
        if(!this.instance){
            this.instance = new RedisManager();
        }
        return this.instance;
    }
    
    public sendAndAwait(message:MessageToEngine){
        return new Promise<MessageFromOrderbook>((resolve)=>{
            const id = this.getRandomId();
            console.log("Sending message to engine: ", message);
            console.log("Message id: ", id);
            this.client.subscribe(id, (message)=>{
                this.client.unsubscribe(id);
                console.log("Received message from engine: ", message);
                resolve(JSON.parse(message));
            })
            console.log("Publishing message to engine: ", message);
            this.publisher.lPush("message", JSON.stringify({clientId: id, message}))
        } )
    }

    private getRandomId(){
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}