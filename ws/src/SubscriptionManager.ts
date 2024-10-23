import { createClient, RedisClientType } from "redis";
import { UserManager } from "./UserManger";

export class SubscriptionManager{
    private static instance:SubscriptionManager;
    private subscriptions: Map<string,string[]> = new Map();
    private reverseSubscription:Map<string,string[]> = new Map();
    private redisClient:RedisClientType;

    private constructor(){
        this.redisClient = createClient();
        this.redisClient.connect();
    }
    
    public static getInstance(){
        if(!this.instance){
            this.instance = new SubscriptionManager();
        }
        return this.instance;
    }

    public subscribe(userId: string, subscription: string){
        if(this.subscriptions.get(userId)?.includes(subscription)){
            return;
        }
        this.subscriptions.set(userId,(this.subscriptions.get(userId) ||[]).concat(subscription));
        this.reverseSubscription.set(subscription,(this.reverseSubscription.get(subscription) || []).concat(userId));
        if(this.reverseSubscription.get(subscription)?.length === 1){
               this.redisClient.subscribe(subscription,this.redisCallbackHandler.bind(this));
        }
    }

    private redisCallbackHandler(message: string ,channel: string){
      const parsedMessage = JSON.parse(message);
      console.log("Received message from redis: ", parsedMessage);
      this.reverseSubscription.get(channel)?.forEach((userId) =>{ UserManager.getInstance().getUser(userId)?.emit(parsedMessage)});
    }
     
    public unsubscribe(userId:string,subscription:string){
        const subscriptions = this.subscriptions.get(userId);
        if(subscriptions){
            this.subscriptions.set(userId,subscriptions.filter(e =>  subscription  !== e))
        } 
        const reverseSubscriptions = this.reverseSubscription.get(subscription);
        if(reverseSubscriptions){
            this.reverseSubscription.set(subscription,reverseSubscriptions.filter(s => s !== userId));
            if(this.reverseSubscription.get(subscription)?.length === 0){
                this.reverseSubscription.delete(subscription);
                this.redisClient.unsubscribe(subscription);
            }
        }
    }
    public userLeft(userId:string){
        console.log(`User ${userId} left`);
        this.subscriptions.get(userId)?.forEach(s => this.unsubscribe(userId,s));
    }

    getSubscriptions(userId:string){
        return this.subscriptions.get(userId) || [];
    }

}