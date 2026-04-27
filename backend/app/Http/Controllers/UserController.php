<?php

namespace App\Http\Controllers;

use App\Services\SsoApiService;

class UserController extends Controller
{
    public function __construct(protected SsoApiService $ssoApi) {}

    public function index()
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->ssoApi->getUsers()
        ]);
    }

    public function show(string $id)
    {
        $user = $this->ssoApi->getUserById($id);
        
        if (empty($user)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data user tidak ditemukan di sistem SSO.'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $user
        ]);
    }

    public function logins()
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->ssoApi->getLogins()
        ]);
    }

    public function active()
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->ssoApi->getActiveUsersDetail()
        ]);
    }
}