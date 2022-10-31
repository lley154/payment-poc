// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  out: string
}

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {

  const output = await exec('./utils/sign-data.sh hello');

  //res.status(200).json({ name: 'John Doe' })
  res.status(200).json({ out: output.stdout.trim() })
}



module.exports.getGitUser = async function getGitUser () {
  // Exec output contains both stderr and stdout outputs
  const nameOutput = await exec('git config --global user.name')
  const emailOutput = await exec('git config --global user.email')

  return { 
    name: nameOutput.stdout.trim(), 
    email: emailOutput.stdout.trim()
  }
};
