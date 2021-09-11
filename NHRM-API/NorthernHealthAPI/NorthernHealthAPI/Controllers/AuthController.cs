﻿using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using NorthernHealthAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace NorthernHealthAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly NHRMDBContext _context;

        public AuthController(NHRMDBContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            var test = await _context.Patient.Where(p => p.Urnumber.Equals("123456789")).Select(p => new { p.FirstName, p.Dob }).ToListAsync(); ;

            return Ok();
        }

        //  GET api/auth/patientlogin
        //  Accepts a Login object - parameters email(string) and password(string). If the model values match a Patient login in the database it
        //returns a JWT, otherwise Unauthorized result if details invalid, BadRequest if login details improper
        [HttpPost, Route("patientlogin")]
        public async Task<IActionResult> Login([FromBody] PatientLogin login)
        {

            if (login == null)
            {
                return BadRequest(new { message = "Invalid client request" });
            }

            var patient = await _context.Patient.Where(p => p.Email == login.Email).Select(p => new Patient
            {
                Urnumber = p.Urnumber,
                Salt = p.Salt,
                Password = p.Password
            }).SingleOrDefaultAsync();

            if (patient != null)
            {
                var passwordHash = SHA512.Create();

                passwordHash.ComputeHash(Encoding.UTF8.GetBytes(login.Password + patient.Salt + Environment.GetEnvironmentVariable("pepper")));

                if (passwordHash.Hash.SequenceEqual(patient.Password))
                {
                    var secretKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Environment.GetEnvironmentVariable("secret")));
                    var signinCredentials = new SigningCredentials(secretKey, SecurityAlgorithms.HmacSha256);

                    var claims = new[] {
                    new Claim(ClaimTypes.Role, "Patient"),
                    new Claim("URNumber", patient.Urnumber)
                };

                    var tokenOptions = new JwtSecurityToken(
                        issuer: Environment.GetEnvironmentVariable("applicationUrl"),
                        audience: Environment.GetEnvironmentVariable("applicationUrl"),
                        claims: claims,
                        expires: DateTime.Now.AddDays(5),
                        signingCredentials: signinCredentials
                    );

                    var tokenString = new JwtSecurityTokenHandler().WriteToken(tokenOptions);

                    return Ok(new { Token = tokenString });
                }
                else
                {
                    return Unauthorized();
                }
            }
            else
            {
                return NotFound(new { message = "Patient not found" });
            }
        }
    }
}
