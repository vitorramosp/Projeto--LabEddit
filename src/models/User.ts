import { UserDB, UserModel, USER_ROLES } from "../types"

export class User {
    constructor (
        private id: string,
        private nickname: string,
        private email: string,
        private password: string,
        private role: USER_ROLES,
        private createdAt: string,
        private updatedAt: string
    ) {}

    public getId(): string {
        return this.id
    }

    public getNickName(): string{
        return this.nickname
    }

    public setNickName(value: string): void{
        this.nickname = value
    }

    public getEmail(): string{
        return this.email
    }

    public setEmail(value: string): void{
        this.email = value
    }

    public getPassword(): string{
        return this.password
    }

    public setPassword(value: string): void{
        this.password = value
    }

    public getRole(): USER_ROLES{
        return this.role
    }

    public setRole(value: USER_ROLES): void{
        this.role = value
    }

    public getCreatedAt(): string {
        return this.createdAt
    }

    public setCreatedAt(value: string){
        this.createdAt = value
    }

    public getUpdatedAt(): string{
        return this.updatedAt
    }

    public setUpdatedAt(value: string){
        this.updatedAt = value
    }

    public toDBModel(): UserDB {
        return {
            id: this.id,
            nickname: this.nickname,
            email: this.email,
            password: this.password,
            role: this.role,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        }
    }

    public toBusinessModel(): UserModel {
        return {
            id: this.id,
            nickname: this.nickname,
            email: this.email,
            password: this.password,
            role: this.role,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        }
    }
    
}