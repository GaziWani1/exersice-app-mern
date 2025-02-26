import { ApiError } from '../utils/ApiError.js';
import bcrypt from 'bcrypt';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import Exercise from '../models/exersices.model.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const signIn = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if ([email, username, password].some((field) => field?.trim() === '')) {
      throw new ApiError(400, 'All fields are required');
    }

    const existUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existUser) throw new ApiError(409, 'User already exists');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    if (user)
      return res
        .status(201)
        .json(new ApiResponse(200, user, 'User registered Successfully'));
    else throw new ApiError(500, 'something went wrong');
  } catch (error) {
    console.log(error);
    throw new ApiError(500, 'internal server errors');
  }
};

const login = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const user = await User.findOne({
      $or: [
        { username: identifier }, // Match if username equals identifier
        { email: identifier }, // Match if email equals identifier
      ],
    });

    console.log(user);

    if (!user) {
      throw new ApiError(404, 'User does not exist');
    }

    const isPassowrdCorrect = await bcrypt.compare(password, user.password);

    if (!isPassowrdCorrect) throw new ApiError(401, 'Invalid user credentials');

    if (user && isPassowrdCorrect) {
      return res.status(201).json(
        new ApiResponse(201, {
          _id: user._id,
          username: user.username,
          email: user.email,
          token: generateToken(user._id),
        })
      );
    }
  } catch (error) {
    console.log(error);
    throw new ApiError(500, 'internal server errors');
  }
};

const addExercisesToUser = async (req, res) => {
  const { userId, exerciseId } = req.body;

  try {
    if (!userId || !exerciseId) {
      throw new ApiError(400, 'User ID and exercise ID are required');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      throw new ApiError(404, `Exercise with ID ${exerciseId} not found`);
    }

    user.exercises.push(exerciseId);

    await user.save();

    return res.status(200).json(new ApiResponse(200, user));
  } catch (error) {
    console.error('Error adding exercise to user:', error);
    throw new ApiError(500, 'Internal server error');
  }
};

export { signIn, login, addExercisesToUser };
