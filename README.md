# 330-final-project-evanparker

Final Project for JSCRIPT 330 B Sp 24: Back-End Application Development With Javascript

## Project proposal

The intention of this project is to be the back end for an image sharing site for miniatures.

### Routes

- Images

  - Create: `POST /images` - requires authentication
  - Update: `PUT /images/:id` - requires authentication
  - Delete: `DELETE /images/:id` - requires authentication
  - Get all: `GET /images` - public

- Minis

  - Get all: `GET /minis` - public, should not include images
  - Get all: `GET /minis?thumbnails=true` - include the first image for each mini
  - Get one: `GET /minis/:id` - public, should include images as objects
  - Create: `POST /minis` - requires authentication
  - Update: `PUT /minis/:id` - requires authentication
  - Delete: `DELETE /minis/:id` - requires authentication

- Figures

  - get all: `GET /figures`
  - get one: `GET /figures/:id`
  - get minis: `GET /figures/:id/minis`
  - search: `GET /figures/search?query=:query`
  - create: `POST /figures/` - requires authentication
  - update: `PUT /figures/:id` - requires authentication
  - Delete: `DELETE /figures/:id` - requires admin

- Manufacturers

  - get all: `GET /manufacturers`
  - get one: `GET /manufacturers/:id`
  - get figures: `GET /manufacturers/:id/figures`
  - search: `GET /manufacturers/search?query=:query`
  - create: `POST /manufacturers` - requires admin
  - update: `PUT /manufacturers` - requires admin
  - Delete: `DELETE /manufacturers/:id` - requires admin

- Users

  - Get user's minis: `GET /users/:username/minis` - public, should provide a list of a user's minis
  - Get a user's Data: `GET /users/:username`
  - Get the logged in user: `GET /users/me`
  - Update user (non-auth data) - `PUT /users/:id`

- Auth

  - Signup: `POST /auth/signup`
  - Login: `POST /auth/login`
  - Logout: `POST /auth/logout`
  - Change Password `PUT /auth/password` - requires authentication

### DAOS

- Images

  - `createImage`

- Minis

  - `getAllMinis`
  - `getMiniById`
  - `getMinisByUserId`
  - `createMini`
  - `updateMini`
  - `deleteMini`

- Figures

  - `getAllFigures`
  - `getFigureById`
  - `createFigure`
  - `updateFigure`
  - `deleteFigure`
  - `getFiguresBymanufacturerId`
  - `getFiguresBySearch`

- Manufacturers

  - `getAllManufacturers`
  - `getManufacturerById`
  - `createManufacturer`
  - `updateManufacturer`
  - `deleteManufacturer`
  - `getManufacturersBySearch`

- Users

  - `createUser`
  - `updateUser`
  - `findUserByUsername`
  - `findUserByEmail`
  - `findUserById`
  - `updateUser`
  - `updateUserPassword`

- Tokens

  - `createToken`
  - `deleteToken`

### MODELS

- User

  - `username`: string, index, unique
  - `email`: string, index, unique
  - `password`: string, encrypt
  - `roles`: [string]
  - `website`: string
  - `description`: string
  - `socials`: [{service: string, link: string}]

- Image

  - `cloudinaryPublicId`: string
  - `userId`

- Token

  - `userId`
  - `token`

- Mini

  - `userId`
  - `images`: [Image]
  - `figure`: id
  - `description`: string

- Figure

  - `name`: string
  - `images`: [Image]
  - `manufacturer`: id
  - `website`: string
  - `description`: string
  - `partNumber`: string

- Manufacturer

  - `name`: string
  - `images`: [Image]
  - `website`: string
  - `description`: string
  - `socials`: [{service: string, link: string}]
