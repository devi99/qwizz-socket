// db.js
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('connect', () => {
  console.log('connected to the db');
});

/**
 * Create Genres Table
 */
const createGenresTable = () => {
  const queryText =
    `CREATE TABLE genres(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),name VARCHAR NOT NULL);`;

  pool.query(queryText)
    .then((res) => {
      console.log(res);
      pool.end();
    })
    .catch((err) => {
      console.log(err);
      pool.end();
    });
}

/**
 * Create Questions Table
 */
const createQuestionsTable = () => {
  const queryText =
    `CREATE TABLE IF NOT EXISTS
      questions(
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        subText TEXT,
        typeQuestion smallint NOT NULL,
        correctAnswer VARCHAR(128) NOT NULL,
        fakeAnswer1 VARCHAR(128) NOT NULL,
        fakeAnswer2 VARCHAR(128) NOT NULL,
        fakeAnswer3 VARCHAR(128) NOT NULL,
        fakeAnswer4 VARCHAR(128) NOT NULL,
        fakeAnswer5 VARCHAR(128) NOT NULL,
        typeMedia VARCHAR(50),
        urlMedia TEXT,
        genres UUID[],
        created_date TIMESTAMP DEFAULT NOW()        ,
        modified_date TIMESTAMP DEFAULT NOW()
      )`;

  pool.query(queryText)
    .then((res) => {
      console.log(res);
      pool.end();
    })
    .catch((err) => {
      console.log(err);
      pool.end();
    });
}

/**
 * Create Questions Table
 */
const createGamesTable = () => {
    const queryText =
      `CREATE TABLE IF NOT EXISTS
        games(
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          gameId integer NOT NULL,
          status smallint NOT NULL,
          type smallint NOT NULL,
          numberOfPlayers smallint NOT NULL,
          questions UUID[] NOT NULL,
          created_date TIMESTAMP DEFAULT NOW(),
          modified_date TIMESTAMP DEFAULT NOW()
        )`;
  
    pool.query(queryText)
      .then((res) => {
        console.log(res);
        pool.end();
      })
      .catch((err) => {
        console.log(err);
        pool.end();
      });
  }

/**
 * Drop Reflection Table
 */
const dropQuestionsTable = () => {
  const queryText = 'DROP TABLE IF EXISTS questions returning *';
  pool.query(queryText)
    .then((res) => {
      console.log(res);
      pool.end();
    })
    .catch((err) => {
      console.log(err);
      pool.end();
    });
}

/**
 * Drop Reflection Table
 */
const dropGamesTable = () => {
  const queryText = 'DROP TABLE IF EXISTS games returning *';
  pool.query(queryText)
    .then((res) => {
      console.log(res);
      pool.end();
    })
    .catch((err) => {
      console.log(err);
      pool.end();
    });
}

/**
 * Drop Reflection Table
 */
const dropGenresTable = () => {
  const queryText = 'DROP TABLE IF EXISTS genres returning *';
  pool.query(queryText)
    .then((res) => {
      console.log(res);
      pool.end();
    })
    .catch((err) => {
      console.log(err);
      pool.end();
    });
}

/**
 * Drop User Table
 */
const dropUserTable = () => {
  const queryText = 'DROP TABLE IF EXISTS users returning *';
  pool.query(queryText)
    .then((res) => {
      console.log(res);
      pool.end();
    })
    .catch((err) => {
      console.log(err);
      pool.end();
    });
}

pool.on('remove', () => {
  console.log('client removed');
  process.exit(0);
});

module.exports = {
  createGenresTable,
  createQuestionsTable,
  createGamesTable,
  dropQuestionsTable,
  dropGamesTable,
  dropQuestionsTable,
  dropUserTable
};

require('make-runnable');
