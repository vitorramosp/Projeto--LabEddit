import { PostsDatabase } from "../database/PostsDataBase"
import { UsersDatabase } from "../database/UsersDatabase"
import { LikesDislikesInputDTO, LikesDislikesOutputDTO } from "../dtos/LikesDislikesDTO"
import { CreatePostInputDTO, CreatePostOutputDTO, DeletePostInputDTO, DeletePostOutputDTO, EditPostInputDTO, EditPostOutputDTO, GetPostInputDTO } from "../dtos/PostDTO"
import { BadRequestError } from "../errors/BadRequestError"
import { NotFoundError } from "../errors/NotFoundError"
import { Post } from "../models/Post"
import { IdGenerator } from "../services/IdGenerator"
import { TokenManager } from "../services/TokenManager"
import { LikeDislikePostDB, PostDB, POST_LIKE, TokenPayload, USER_ROLES } from "../types"


export class PostBusiness {
    constructor(
        private postsDatabase: PostsDatabase,
        private idGenerator: IdGenerator,
        private usersDatabase: UsersDatabase,
        private tokenManager: TokenManager
    ) { }

    public getPosts = async (input: GetPostInputDTO): Promise<CreatePostOutputDTO[]> => {

        const { token } = input

        if (token === undefined) {
            throw new BadRequestError("'token' ausente")
        }

        const payload = this.tokenManager.getPayload(token)

        if (payload === null) {
            throw new BadRequestError("'token'inválido")
        }

        const postsDB: PostDB[] = await this.postsDatabase.getAllPosts()

        const users = await this.usersDatabase.getAllUsers()

        const posts = postsDB.map((postDB) => {
            const userFind = users.find((user)=>user.id === postDB.creator_id)

            if(!userFind){
                throw new BadRequestError ("Usuário não encontrado")
            }

            const user: TokenPayload = {
                id: userFind.id,
                nickname: userFind.nickname,
                role: userFind.role
            }

            const post = new Post(
                postDB.id,
                user.id,
                postDB.content,
                postDB.likes,
                postDB.dislikes,
                postDB.comments,
                user.nickname,
                postDB.created_at,
                postDB.updated_at,
            )

            return post.toBusinessModel()
        }
        )

        const output: CreatePostOutputDTO[] = posts
        return output        
    }

    public createPost = async (input: CreatePostInputDTO): Promise<CreatePostOutputDTO> => {

        const { content, token } = input

        if (token === undefined) {
            throw new BadRequestError("'token' ausente")
        }

        if (token === null) {
            throw new BadRequestError("'token' deve ser informado")
        }

        const payload = this.tokenManager.getPayload(token)

        if (payload === null) {
            throw new BadRequestError("token não é valido")
        }
        
        const id = this.idGenerator.generate()
        const creatorId = payload.id
        const creatorNickname = payload.nickname
        let newLikes = 0
        let newDislikes = 0
        let newComments = 0

        const newPost = new Post(
            id,
            creatorId,
            content,
            newLikes,
            newDislikes,
            newComments,
            creatorNickname,            
            new Date().toISOString(),
            new Date().toISOString(),
        )
        
        const newPostDB = newPost.toDBModel()

        await this.postsDatabase.insertPost(newPostDB)

        const output: CreatePostOutputDTO = newPost.toBusinessModel()

        return output
    }

    public editPost = async (input: EditPostInputDTO): Promise<EditPostOutputDTO> => {

        const { idToEdit, token, content } = input

        if (token === undefined) {
            throw new BadRequestError("'token' ausente")
        }

        if (token === null) {
            throw new BadRequestError("'token' deve ser informado")
        }

        const postDB = await this.postsDatabase.getPostById(idToEdit)

        if (!postDB) {
            throw new NotFoundError("'id' não encontrado")
        }

        const payload = this.tokenManager.getPayload(token)

        if (payload === null) {
            throw new BadRequestError("token não é valido")
        }

        const creatorId = payload.id

        if (postDB.creator_id !== creatorId) {
            throw new BadRequestError("somente quem criou o post pode editá-la")
        }

        const creatorNickname = payload.nickname

        const newPost = new Post(
            postDB.id,
            creatorId,
            postDB.content,
            postDB.likes,
            postDB.dislikes,
            postDB.comments,
            creatorNickname,
            postDB.created_at,
            postDB.updated_at    
        )

        newPost.setContent(content)
        newPost.setUpdatedAt(new Date().toISOString())

        const newPostDB = newPost.toDBModel()

        await this.postsDatabase.updatePostById(idToEdit, newPostDB)

        return ({
            message: "Post editado com sucesso"
        })
    }

    public deletePost = async (input: DeletePostInputDTO): Promise<DeletePostOutputDTO> => {

        const { idToDelete, token } = input

        if (token === undefined) {
            throw new BadRequestError("'token' ausente")
        }

        if (token === null) {
            throw new BadRequestError("'token' deve ser informado")
        }

        const payload = this.tokenManager.getPayload(token)

        if (payload === null) {
            throw new BadRequestError("token não é valido")
        }

        const postDB = await this.postsDatabase.getPostById(idToDelete)

        if (!postDB) {

            throw new NotFoundError("Id não encontrado")
        }

        const creatorId = payload.id

        if (
            payload.role !== USER_ROLES.ADMIN &&
            postDB.creator_id !== creatorId) {
            throw new BadRequestError("somente quem criou o post pode deletá-la")
        }

        await this.postsDatabase.deletePostById(idToDelete)

        return ({
            message: "Post deletado com sucesso"
        })

    }

    public likeOrDislikePost = async (input: LikesDislikesInputDTO): Promise<LikesDislikesOutputDTO> => {

        const { id, token, like } = input

        let message = "Like realizado com sucesso"

        if (token === undefined) {
            throw new BadRequestError("'token' ausente")
        }

        if (token === null) {
            throw new BadRequestError("'token' deve ser informado")
        }

        const payload = this.tokenManager.getPayload(token)

        if (payload === null) {
            throw new BadRequestError("token não é valido")
        }

        if (typeof like !== "boolean") {
            throw new BadRequestError("'like' deve ser um booleano")
        }

        const [postWithCreatorDB] = await this.postsDatabase.getPostWithCreatorById(id)


        if (!postWithCreatorDB) {
            throw new NotFoundError("Id não encontrado")
        }

        const userId = payload.id
        const likeSQLite = like ? 1 : 0

        const likeDislikePostDB: LikeDislikePostDB = {
            user_id: userId,
            post_id: postWithCreatorDB.id,
            like: likeSQLite
        }

        const post = new Post(
            postWithCreatorDB.id,
            postWithCreatorDB.creator_id,
            postWithCreatorDB.content,
            postWithCreatorDB.likes,
            postWithCreatorDB.dislikes,
            postWithCreatorDB.comments,
            postWithCreatorDB.creator_nickname,
            postWithCreatorDB.created_at,
            postWithCreatorDB.updated_at            
        )

        const likeDislikeExist = await this.postsDatabase
            .getLikeDislike(likeDislikePostDB)
        
        if (likeDislikeExist === POST_LIKE.ALREADY_LIKED) {

            if (like) {
                await this.postsDatabase.removeLikeDislike(likeDislikePostDB)
                post.removeLike()
                message = "Like desfeito com sucesso"
                
            } else {
                await this.postsDatabase.updateLikeDislike(likeDislikePostDB)
                post.removeLike()
                post.addDislike()
                message = "Reação invertida com sucesso"
            }
        } else if (likeDislikeExist === POST_LIKE.ALREADY_DISLIKED) {
            if (like) {
                await this.postsDatabase.updateLikeDislike(likeDislikePostDB)
                post.removeDislike()
                post.addLike()
                message = "Reação invertida com sucesso"
            } else {
                await this.postsDatabase.removeLikeDislike(likeDislikePostDB)
                post.removeDislike()
                message = "Dislike desfeito com sucesso"

            }
        } else {

            await this.postsDatabase.likeOrDislikePost(likeDislikePostDB)

            like ? post.addLike() : post.addDislike()

        }

        const updatePostDB = post.toDBModel()

        await this.postsDatabase.updatePostById(id, updatePostDB)


        return({
            message: message
        }
        )
    }

}